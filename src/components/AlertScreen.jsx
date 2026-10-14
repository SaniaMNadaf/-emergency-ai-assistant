import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AlertScreen({ broadcast, onResponded }) {
  const [incident, setIncident] = useState(null)
  const [incidentDetails, setIncidentDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadIncident() {
      if (!supabase || !broadcast) return
      const { data: inc } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', broadcast.incident_id)
        .single()

      if (inc) {
        setIncident(inc)
        // Call RPC incident_details to get lat/lng numbers
        const { data: details } = await supabase.rpc('incident_details', { p_incident_id: inc.id })
        if (details && details.length > 0) {
          setIncidentDetails(details[0])
        }
      }
      setLoading(false)
    }
    loadIncident()
  }, [broadcast])

  const handleRespond = async (etaMinutes) => {
    if (!supabase || !broadcast) return
    setSubmitting(true)
    const { error } = await supabase
      .from('broadcasts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        eta_minutes: etaMinutes
      })
      .eq('id', broadcast.id)

    // Also update incident status if open
    if (!error && incident) {
      await supabase
        .from('incidents')
        .update({ status: 'acknowledged', outcome: 'genuine' })
        .eq('id', incident.id)
        .eq('status', 'open')
    }

    setSubmitting(false)
    onResponded()
  }

  const handleDecline = async () => {
    if (!supabase || !broadcast) return
    setSubmitting(true)
    await supabase
      .from('broadcasts')
      .update({ status: 'declined' })
      .eq('id', broadcast.id)
    setSubmitting(false)
    onResponded()
  }

  if (loading) return <div className="card text-center">Loading incoming emergency alert...</div>

  const lat = incidentDetails?.lat || 37.7749
  const lng = incidentDetails?.lng || -122.4194
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div className="card" style={{ background: '#fee2e2', borderColor: '#dc2626', marginBottom: '16px' }}>
        <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>🚨 INCOMING EMERGENCY ALERT</h2>
        <p style={{ fontSize: '14px' }}>Tier {broadcast.tier} Broadcast — Immediate response requested.</p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Incident Details</h3>
        <p><strong>Reported:</strong> {new Date(incident?.created_at || Date.now()).toLocaleTimeString()}</p>
        <p><strong>Location:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}</p>
        <div style={{ marginTop: '12px' }}>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            🗺️ Open Location in Google Maps
          </a>
        </div>

        {incident?.has_photo && incident?.photo_path && (
          <div style={{ marginTop: '16px' }}>
            <p><strong>Attached Photo:</strong></p>
            {/* Display photo from signed URL */}
            <PhotoDisplay supabase={supabase} photoPath={incident.photo_path} />
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: '12px' }}>Acknowledge & Set ETA</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <button className="btn btn-primary" onClick={() => handleRespond(5)} disabled={submitting} style={{ background: 'var(--success)' }}>
          Accept (5 min)
        </button>
        <button className="btn btn-primary" onClick={() => handleRespond(10)} disabled={submitting} style={{ background: 'var(--success)' }}>
          Accept (10 min)
        </button>
        <button className="btn btn-primary" onClick={() => handleRespond(15)} disabled={submitting} style={{ background: 'var(--success)' }}>
          Accept (15 min)
        </button>
        <button className="btn btn-danger" onClick={handleDecline} disabled={submitting}>
          Decline
        </button>
      </div>
    </div>
  )
}

function PhotoDisplay({ supabase, photoPath }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!supabase || !photoPath) return
    supabase.storage
      .from('incident-photos')
      .createSignedUrl(photoPath, 600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl)
      })
  }, [supabase, photoPath])

  if (!url) return <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading photo...</p>
  return <img src={url} alt="Emergency" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />
}
