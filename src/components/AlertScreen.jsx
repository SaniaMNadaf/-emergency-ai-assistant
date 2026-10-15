import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { MapPin, Camera, Phone, Check, X } from 'lucide-react'

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
    await supabase
      .from('broadcasts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        eta_minutes: etaMinutes,
      })
      .eq('id', broadcast.id)

    if (incident) {
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

  if (loading) return (
    <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-3)' }}>Loading alert...</p>
    </div>
  )

  const lat = incidentDetails?.lat
  const lng = incidentDetails?.lng
  const hasLocation = lat !== null && lat !== undefined && lng !== null && lng !== undefined
  const mapUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #334159 100%)',
      padding: 'var(--sp-4)',
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <Card style={{
          background: 'var(--color-danger-light)',
          borderColor: 'var(--color-danger)',
          marginBottom: 'var(--sp-4)',
          textAlign: 'center',
          padding: 'var(--sp-5)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <h2 style={{ color: 'var(--color-danger)', margin: '0 0 var(--sp-2)', fontSize: 'var(--font-size-xl)' }}>
            🚨 INCOMING EMERGENCY ALERT
          </h2>
          <Badge variant="tier1" style={{ fontSize: 'var(--font-size-sm)' }}>
            Tier {broadcast.tier} Broadcast — Immediate response requested
          </Badge>
        </Card>

        <Card title="Incident Details" style={{ marginBottom: 'var(--sp-4)', background: 'var(--color-surface-elevated)' }}>
          <p style={{ marginBottom: 'var(--sp-2)' }}>
            <strong>Reported:</strong> {new Date(incident?.created_at || Date.now()).toLocaleTimeString()}
          </p>
          <p>
            <strong>Location:</strong>
            {hasLocation ? (
              <span style={{ marginLeft: 'var(--sp-2)' }}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            ) : (
              <span style={{ color: 'var(--color-danger)', marginLeft: 'var(--sp-2)' }}>Location unavailable</span>
            )}
          </p>

          {hasLocation && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <MapPin size={16} style={{ marginRight: 'var(--sp-1)' }} />
                Open Location in Google Maps
              </a>
            </div>
          )}

          {incident?.has_photo && incident?.photo_path && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <p><strong>Attached Photo:</strong></p>
              <PhotoDisplay supabase={supabase} photoPath={incident.photo_path} />
            </div>
          )}
        </Card>

        <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--font-size-lg)' }}>Acknowledge & Set ETA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
          <Button variant="success" onClick={() => handleRespond(5)} loading={submitting}>
            <Check size={20} style={{ marginRight: 'var(--sp-1)' }} />
            Accept (5 min)
          </Button>
          <Button variant="success" onClick={() => handleRespond(10)} loading={submitting}>
            <Check size={20} style={{ marginRight: 'var(--sp-1)' }} />
            Accept (10 min)
          </Button>
          <Button variant="success" onClick={() => handleRespond(15)} loading={submitting}>
            <Check size={20} style={{ marginRight: 'var(--sp-1)' }} />
            Accept (15 min)
          </Button>
          <Button variant="danger" onClick={handleDecline} loading={submitting}>
            <X size={20} style={{ marginRight: 'var(--sp-1)' }} />
            Decline
          </Button>
        </div>
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

  if (!url) return <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Loading photo...</p>
  return <img src={url} alt="Emergency" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginTop: 'var(--sp-2)' }} />
}
