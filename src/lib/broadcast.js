import { supabase } from './supabase'

export const RADIUS_METERS = 5000
export const ESCALATION_INTERVAL_MS = 15000 // 15 seconds

export async function reportEmergency(user, location, photoFile) {
  if (!supabase) throw new Error('Supabase not configured')

  // Offline check or network failure handling
  const isOnline = navigator.onLine

  // Convert photo to data URL if present (and reasonable size)
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
    saveOfflineReport({ user, location, photoDataUrl })
    throw new Error('Saved offline - will send when connection returns')
  }

  try {
    // 1. Upload photo if present
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
    const tier1Allowed = hasGps && hasPhoto

    // 2. Create incident record
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

    // 3. Query nearby responders via RPC
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

    // 4. Insert Tier 1 broadcasts if allowed
    const broadcastRecords = []
    const startingTier = tier1Allowed ? 1 : 2 // If Tier 1 not allowed, start at Tier 2
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

    // 5. Rate limit: only count a report toward the rate limit AFTER it succeeds
    incrementRateLimit(user.id)

    return { incident, broadcasts: broadcastRecords, tier1Allowed, initialTier: startingTier }
    } catch (_err) {
    // If network request fails during transmission, save offline
    saveOfflineReport({ user, location, photoDataUrl })
    throw new Error('Network error. Saved offline - will send when connection returns')
  }
}

function saveOfflineReport(reportData) {
  const pending = JSON.parse(localStorage.getItem('pending_reports') || '[]')
  pending.push({ ...reportData, timestamp: Date.now() })
  localStorage.setItem('pending_reports', JSON.stringify(pending))
}

export async function syncPendingReports(user) {
  if (!supabase || !navigator.onLine) return
  const pending = JSON.parse(localStorage.getItem('pending_reports') || '[]')
  if (pending.length === 0) return

  const remaining = []
  for (const report of pending) {
    try {
      // Re-attempt report
      let photoFile = null
      if (report.photoDataUrl) {
        // convert dataUrl back to Blob/File
        const res = await fetch(report.photoDataUrl)
        const blob = await res.blob()
        photoFile = new File([blob], 'offline-photo.jpg', { type: 'image/jpeg' })
      }
      await reportEmergency(user, report.location, photoFile)
    } catch {
      remaining.push(report)
    }
  }
  localStorage.setItem('pending_reports', JSON.stringify(remaining))
}

// Listen to online event to auto-sync pending reports
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const user = JSON.parse(localStorage.getItem('demo_user') || 'null')
    if (user) syncPendingReports(user)
  })
}

function incrementRateLimit(userId) {
  const rateKey = `reports_${userId}`
  const recent = JSON.parse(localStorage.getItem(rateKey) || '[]')
  recent.push(Date.now())
  localStorage.setItem(rateKey, JSON.stringify(recent))
}

export async function checkRateLimit(userId) {
  const rateKey = `reports_${userId}`
  const recent = JSON.parse(localStorage.getItem(rateKey) || '[]')
  const now = Date.now()
  const validRecent = recent.filter(t => now - t < 600000) // 10 minutes
  return validRecent.length >= 3
}

export async function escalateBroadcasts(incidentId, currentTier) {
  if (!supabase) return { success: false, nextTier: currentTier }
  const nextTier = currentTier + 1
  if (nextTier > 3) return { success: false, nextTier: currentTier }

  // 1. Mark earlier unanswered broadcasts for that incident as 'expired'
  await supabase
    .from('broadcasts')
    .update({ status: 'expired' })
    .eq('incident_id', incidentId)
    .eq('status', 'sent')

  // 2. Get incident location via incident_details RPC
  const { data: details } = await supabase.rpc('incident_details', { p_incident_id: incidentId })

  let lat = 18.5204
  let lng = 73.8567
  if (details && details.length > 0 && details[0]?.lat !== null) {
    lat = details[0].lat
    lng = details[0].lng
  }

  const { data: existingBroadcasts } = await supabase
    .from('broadcasts')
    .select('responder_id')
    .eq('incident_id', incidentId)

  const alreadyBroadcastedIds = new Set((existingBroadcasts || []).map(b => b.responder_id))

  // 3. Use nearby_responders within radius
  const { data: responders } = await supabase.rpc('nearby_responders', {
    lat,
    lng,
    radius_m: RADIUS_METERS
  })

  if (!responders || responders.length === 0) return { success: false, nextTier: currentTier }

  const targetResponders = responders.filter(
    r => r.tier === nextTier && r.available && !alreadyBroadcastedIds.has(r.id)
  )

  if (targetResponders.length === 0) {
    // If no responders in next tier, try jumping to tier after if < 3
    if (nextTier < 3) {
      return escalateBroadcasts(incidentId, nextTier)
    }
    return { success: false, nextTier: currentTier }
  }

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
