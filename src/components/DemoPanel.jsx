import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { requestGeolocation } from '../lib/permissions'
import { reportEmergency } from '../lib/broadcast'

const DEMO_FALLBACK_LAT = 18.5204
const DEMO_FALLBACK_LNG = 73.8567

export default function DemoPanel({ user, onClose }) {
  const [responders, setResponders] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadResponders()
  }, [])

  async function loadResponders() {
    if (!supabase) return
    const { data } = await supabase.from('responders').select('*').order('tier')
    if (data) setResponders(data)
  }

  const handleTriggerFakeEmergency = async () => {
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    try {
      let loc = null
      try {
        loc = await requestGeolocation()
      } catch {
        // GPS unavailable — fall back to first responder's area via nearby_responders
        const { data: nearby } = await supabase.rpc('nearby_responders', {
          lat: DEMO_FALLBACK_LAT,
          lng: DEMO_FALLBACK_LNG,
          radius_m: 50000
        })
        if (nearby && nearby.length > 0) {
          loc = { lat: DEMO_FALLBACK_LAT, lng: DEMO_FALLBACK_LNG, accuracy: 1000 }
        } else {
          loc = { lat: DEMO_FALLBACK_LAT, lng: DEMO_FALLBACK_LNG, accuracy: 1000 }
        }
      }

      await reportEmergency(user, loc, null)
      setMessage('Triggered fake emergency with GPS/location and broadcast logic!')
      loadResponders()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFakeDoctorAccept = async () => {
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    try {
      const { data: inc } = await supabase
        .from('incidents')
        .select('id')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!inc) {
        setMessage('No open incident found to acknowledge.')
        setLoading(false)
        return
      }

      const { error } = await supabase.rpc('demo_acknowledge', { p_incident_id: inc.id, p_eta: 8 })
      if (error) throw error
      setMessage(`Doctor accepted via demo_acknowledge!`)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetDemo = async () => {
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('reset_demo')
      if (error) throw error
      setMessage('Demo data reset successfully!')
      loadResponders()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleResponderAvail = async (id, currentAvail) => {
    if (!supabase) return
    await supabase.from('responders').update({ available: !currentAvail }).eq('id', id)
    loadResponders()
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Demo Control Panel</h2>
        <button className="btn btn-outline" onClick={onClose} style={{ width: 'auto', padding: '8px 16px' }}>Close</button>
      </div>

      {message && <div className="banner banner-online" style={{ marginBottom: '16px' }}>{message}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={handleTriggerFakeEmergency} disabled={loading}>
          🚨 Trigger Fake Emergency
        </button>
        <button className="btn btn-primary" onClick={handleFakeDoctorAccept} disabled={loading} style={{ background: 'var(--success)' }}>
          👨‍⚕️ Fake Doctor Accepts (ETA 8m)
        </button>
        <button className="btn btn-danger" onClick={handleResetDemo} disabled={loading}>
          🔄 Reset Demo Data
        </button>
      </div>

      <div className="card">
        <h3>Responders Status</h3>
        {responders.map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{r.display_name}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.kind} (Tier {r.tier})</div>
            </div>
            <button
              className="btn btn-outline"
              style={{ width: 'auto', padding: '4px 8px', fontSize: '12px', background: r.available ? '#dcfce8' : '#fee2e2' }}
              onClick={() => toggleResponderAvail(r.id, r.available)}
            >
              {r.available ? 'Available' : 'Offline'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
