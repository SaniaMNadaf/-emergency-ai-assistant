import { supabase } from './supabase'

export const RADIUS_METERS = 5000
export const ESCALATION_INTERVAL_MS = 15000
export const RATE_LIMIT_MAX = 3
export const RATE_LIMIT_WINDOW_MS = 600000 // 10 minutes

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded for key:', key)
    }
    return false
  }
}

const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export async function reportEmergency(user, location, photoFile, opts = {}) {
  if (!supabase) throw new Error('Supabase not configured')

  const { forceTier1 = false } = opts

  const isOnline = navigator.onLine

  const rateLimited = await checkRateLimit(user.id)
  if (rateLimited) {
    throw new Error(`Rate limit: max ${RATE_LIMIT_MAX} reports per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`)
  }

  let photoDataUrl = null
  if (photoFile && photoFile.size < 1024 * 1024 * 2) {
    try {
      photoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(photoFile)
      })
    } catch {
      photoDataUrl = null
    }
  }

  if (!isOnline) {
    saveOfflineReport({ user, location, photoDataUrl, forceTier1 })
    throw new Error('Saved offline - will send when connection returns')
  }

  try {
    let photoPath = null
    let hasPhoto = false
    if (photoFile) {
      const ext = photoFile.name ? photoFile.name.split('.').pop() : 'jpg'
      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('incident-photos')
        .upload(fileName, photoFile)
      if (!uploadErr && uploadData) {
        photoPath = uploadData.path
        hasPhoto = true
      }
    }

    const hasGps = !!(location && location.lat !== undefined && location.lng !== undefined)
    const tier1Allowed = forceTier1 ? hasGps : hasGps && hasPhoto

    const pointText = hasGps ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null
    const { data: incident, error: incErr } = await supabase
      .from('incidents')
      .insert({
        reporter_id: user.id,
        location: pointText,
        has_photo: hasPhoto,
        photo_path: photoPath,
        status: 'open',
        outcome: 'unresolved'
      })
      .select()
      .single()

    if (incErr) throw incErr

    let responders = []
    if (hasGps) {
      const { data: respData, error: respErr } = await supabase.rpc('nearby_responders', {
        lat: location.lat,
        lng: location.lng,
        radius_m: RADIUS_METERS
      })
      if (!respErr && respData) {
        responders = respData
      }
    }

    const broadcastRecords = []
    const startingTier = tier1Allowed ? 1 : 2
    const targetResponders = responders.filter(r => r.tier === startingTier && r.available)

    for (const r of targetResponders) {
      const { data: bData } = await supabase
        .from('broadcasts')
        .insert({
          incident_id: incident.id,
          responder_id: r.id,
          tier: startingTier,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single()
      if (bData) broadcastRecords.push(bData)
    }

    incrementRateLimit(user.id)

    return { incident, broadcasts: broadcastRecords, tier1Allowed, initialTier: startingTier }
  } catch {
    saveOfflineReport({ user, location, photoDataUrl, forceTier1 })
    throw new Error('Network error. Saved offline - will send when connection returns')
  }
}

function saveOfflineReport(reportData) {
  const pending = JSON.parse(safeGetItem('pending_reports') || '[]')
  const newReport = { ...reportData, id: crypto.randomUUID(), timestamp: Date.now() }
  pending.push(newReport)
  safeSetItem('pending_reports', JSON.stringify(pending))
  return newReport.id
}

export function getPendingReportCount() {
  try {
    return JSON.parse(safeGetItem('pending_reports') || '[]').length
  } catch {
    return 0
  }
}

export async function syncPendingReports(user) {
  if (!supabase || !navigator.onLine || !user) return
  const pending = JSON.parse(safeGetItem('pending_reports') || '[]')
  if (pending.length === 0) return

  const remaining = []
  for (const report of pending) {
    const rateLimited = await checkRateLimit(user.id)
    if (rateLimited) {
      remaining.push(report)
      continue
    }
    try {
      let photoFile = null
      if (report.photoDataUrl) {
        const res = await fetch(report.photoDataUrl)
        const blob = await res.blob()
        photoFile = new File([blob], 'offline-photo.jpg', { type: 'image/jpeg' })
      }
      const opts = report.forceTier1 ? { forceTier1: true } : {}
      await reportEmergency(user, report.location, photoFile, opts)
    } catch {
      remaining.push(report)
    }
  }
  safeSetItem('pending_reports', JSON.stringify(remaining))
}

export function initOfflineSync(user) {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    if (user) syncPendingReports(user)
  })
}

function incrementRateLimit(userId) {
  const rateKey = `reports_${userId}`
  let recent = []
  try {
    recent = JSON.parse(safeGetItem(rateKey) || '[]')
  } catch {
    recent = []
  }
  recent.push(Date.now())
  safeSetItem(rateKey, JSON.stringify(recent))
}

export async function checkRateLimit(userId) {
  const rateKey = `reports_${userId}`
  const recent = JSON.parse(safeGetItem(rateKey) || '[]')
  const now = Date.now()
  const validRecent = recent.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  return validRecent.length >= RATE_LIMIT_MAX
}

export async function escalateBroadcasts(incidentId, currentTier) {
  if (!supabase) return { success: false, nextTier: currentTier }
  const nextTier = currentTier + 1
  if (nextTier > 3) return { success: false, nextTier: currentTier }

  const { data: details } = await supabase.rpc('incident_details', { p_incident_id: incidentId })

  if (!details || details.length === 0 || details[0]?.lat === null || details[0]?.lng === null) {
    return { success: false, nextTier: currentTier, reason: 'No incident location available' }
  }

  const { lat, lng } = details[0]

  const { data: existingBroadcasts } = await supabase
    .from('broadcasts')
    .select('responder_id')
    .eq('incident_id', incidentId)

  const alreadyBroadcastedIds = new Set((existingBroadcasts || []).map(b => b.responder_id))

  const { data: responders } = await supabase.rpc('nearby_responders', {
    lat,
    lng,
    radius_m: RADIUS_METERS
  })

  if (!responders || responders.length === 0) {
    return { success: false, nextTier: currentTier }
  }

  let targetResponders = responders.filter(
    r => r.tier === nextTier && r.available && !alreadyBroadcastedIds.has(r.id)
  )

  if (targetResponders.length === 0) {
    if (nextTier < 3) {
      return escalateBroadcasts(incidentId, nextTier)
    }
    return { success: false, nextTier: currentTier }
  }

  await supabase
    .from('broadcasts')
    .update({ status: 'expired' })
    .eq('incident_id', incidentId)
    .eq('status', 'sent')

  for (const r of targetResponders) {
    await supabase.from('broadcasts').insert({
      incident_id: incidentId,
      responder_id: r.id,
      tier: nextTier,
      status: 'sent',
      sent_at: new Date().toISOString()
    })
  }

  return { success: true, nextTier }
}

export async function getDemoResponderLocation() {
  if (!supabase) return null
  try {
    const { data } = await supabase.rpc('responders_geo')
    if (data && data.length > 0) {
      const r = data[0]
      return { lat: r.lat, lng: r.lng, displayName: r.display_name }
    }
    return null
  } catch {
    return null
  }
}
