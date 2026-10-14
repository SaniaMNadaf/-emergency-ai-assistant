import { supabase } from './supabase'

export const RADIUS_METERS = 5000
export const ESCALATION_INTERVAL_MS = 15000 // 15 seconds

export async function reportEmergency(user, location, photoFile) {
  if (!supabase) throw new Error('Supabase not configured')

  // 1. Rate limit check (max 3 reports in 10 minutes)
  const rateKey = `reports_${user.id}`
  const recent = JSON.parse(localStorage.getItem(rateKey) || '[]')
  const now = Date.now()
  const validRecent = recent.filter(t => now - t < 600000)
  if (validRecent.length >= 3) {
    throw new Error('Rate limit exceeded: max 3 reports per 10 minutes. Routed to low-confidence mode.')
  }
  validRecent.push(now)
  localStorage.setItem(rateKey, JSON.stringify(validRecent))

  // 2. Upload photo if present
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

  // 3. Corroboration rule: Tier 1 requires GPS lock AND photo
  const hasGps = !!(location && location.lat && location.lng)
  const tier1Allowed = hasGps && hasPhoto

  // 4. Create incident record
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

  // 5. Query nearby responders via RPC
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

  // 6. Insert Tier 1 broadcasts if allowed
  const broadcastRecords = []
  const tier1Responders = responders.filter(r => r.tier === 1 && r.available)

  if (tier1Allowed) {
    for (const r of tier1Responders) {
      const { data: bData } = await supabase
        .from('broadcasts')
        .insert({
          incident_id: incident.id,
          responder_id: r.id,
          tier: 1,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single()
      if (bData) broadcastRecords.push(bData)
    }
  }

  return { incident, broadcasts: broadcastRecords, tier1Allowed }
}

export async function escalateBroadcasts(incidentId, currentTier) {
  if (!supabase) return false
  const nextTier = currentTier + 1
  if (nextTier > 3) return false

  // Find responders for next tier that aren't already broadcasted
  const { data: incident } = await supabase


  // For simplicity in demo, select available responders of that tier
  const { data: responders } = await supabase
    .from('responders')
    .select('id, tier, available')
    .eq('tier', nextTier)
    .eq('available', true)

  if (!responders || responders.length === 0) return false

  for (const r of responders) {
    await supabase.from('broadcasts').insert({
      incident_id: incidentId,
      responder_id: r.id,
      tier: nextTier,
      status: 'sent',
      sent_at: new Date().toISOString()
    })
  }
  return true
}
