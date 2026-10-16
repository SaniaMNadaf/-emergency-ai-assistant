import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { reportEmergency, getDemoResponderLocation } from '../lib/broadcast'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Banner } from './ui/Banner'
import { Smartphone, RefreshCw, Check, X, Trash2 } from 'lucide-react'

import { useAuth } from '../lib/auth'

export default function DemoPanel({ user, onClose }) {
  const { login, DEMO_ACCOUNTS, DEMO_PASSWORD } = useAuth()
  const [responders, setResponders] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchRole = async (acct) => {
    try {
      await login(acct.email, DEMO_PASSWORD)
      setMessage(`Switched to ${acct.role.toUpperCase()} role`)
    } catch (err) {
      setMessage(`Error switching: ${err.message}`)
    }
  }


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
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
      } catch {
        const demoLoc = await getDemoResponderLocation()
        if (demoLoc) {
          loc = { lat: demoLoc.lat, lng: demoLoc.lng, accuracy: 1000 }
          setMessage(`GPS unavailable — using demo responder location near ${demoLoc.displayName}`)
        } else {
          setMessage('No GPS and no demo responders found — cannot determine location')
          setLoading(false)
          return
        }
      }

      await reportEmergency(user, loc, null, { forceTier1: true })
      setMessage('Triggered fake emergency! Tier 1 doctor alerted.')
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
    <div style={{
      position: 'fixed',
      inset: 'var(--sp-4)',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      maxWidth: '480px',
      margin: 'var(--sp-4) auto',
      padding: 'var(--sp-5)',
      overflowY: 'auto',
      maxHeight: '90vh',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <h2 style={{ margin: 0 }}>Demo Control Panel</h2>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close demo panel">✕</button>
      </div>

      {message && <Banner variant={message.includes('Error') ? 'error' : 'success'} style={{ marginBottom: 'var(--sp-4)' }}>{message}</Banner>}

      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--sp-2)', fontSize: '15px' }}>Switch Active View & Role</h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          Current Role: <strong style={{ color: '#ef4444', textTransform: 'uppercase' }}>{user?.role}</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {DEMO_ACCOUNTS?.map((acct) => (
            <button
              key={acct.id}
              onClick={() => switchRole(acct)}
              style={{
                backgroundColor: user?.role === acct.role ? '#ef4444' : '#18202d',
                color: '#ffffff',
                border: '1px solid #2e3d52',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {acct.role === 'police' ? 'Police CAD' : acct.role}
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--sp-3)' }}>Emergency Simulation</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-3)' }}>
          Trigger a simulated emergency to test alert broadcasts.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <Button variant="danger" icon={Smartphone} loading={loading} onClick={handleTriggerFakeEmergency}>
            Trigger Fake Emergency
          </Button>
          <Button variant="success" icon={Check} loading={loading} onClick={handleFakeDoctorAccept}>
            Fake Doctor Accept (ETA 8m)
          </Button>
          <Button variant="outline" icon={RefreshCw} loading={loading} onClick={handleResetDemo}>
            Reset Demo Data
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--sp-3)' }}>Responder Status</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-3)' }}>
          {responders.filter(r => r.available).length} of {responders.length} responders on duty
        </p>
        {responders.length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No responders found.</p>
        ) : (
          responders.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--sp-2) 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <strong>{r.display_name}</strong>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {r.kind} • Tier {r.tier} • {r.specialty}
                </div>
              </div>
              <Button
                variant={r.available ? 'success' : 'ghost'}
                size="sm"
                style={{ minWidth: 'auto', padding: 'var(--sp-1) var(--sp-3)' }}
                onClick={() => toggleResponderAvail(r.id, r.available)}
                ariaLabel={r.available ? 'Set offline' : 'Set available'}
              >
                {r.available ? (
                  <Badge variant="ok" style={{ fontSize: 'var(--font-size-xs)' }}>Available</Badge>
                ) : (
                  <Badge variant="declined" style={{ fontSize: 'var(--font-size-xs)' }}>Offline</Badge>
                )}
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
