import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { escalateBroadcasts, ESCALATION_INTERVAL_MS } from '../lib/broadcast'

export default function StatusScreen({ incident, broadcasts: initialBroadcasts, onStartProtocol, onReset }) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts || [])
  const [acknowledgedResponder, setAcknowledgedResponder] = useState(null)
  const [eta, setEta] = useState(null)
  const [currentTier, setCurrentTier] = useState(1)
  const [escalated, setEscalated] = useState(false)
  const [falseAlarm, setFalseAlarm] = useState(false)

  // Realtime subscription on broadcasts for this incident
  useEffect(() => {
    if (!supabase || !incident) return

    // Fetch initial broadcasts state
    supabase
      .from('broadcasts')
      .select('*, responders(display_name, specialty, kind, tier)')
      .eq('incident_id', incident.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBroadcasts(data)
          const ack = data.find(b => b.status === 'acknowledged')
          if (ack) {
            setAcknowledgedResponder(ack.responders?.display_name || 'Responder')
            setEta(ack.eta_minutes)
          }
        }
      })

    const channel = supabase
      .channel(`incident-${incident.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcasts', filter: `incident_id=eq.${incident.id}` },
        async (payload) => {
          // Refresh broadcasts
          const { data } = await supabase
            .from('broadcasts')
            .select('*, responders(display_name, specialty, kind, tier)')
            .eq('incident_id', incident.id)
          if (data) {
            setBroadcasts(data)
            const ack = data.find(b => b.status === 'acknowledged')
            if (ack) {
              setAcknowledgedResponder(ack.responders?.display_name || 'Responder')
              setEta(ack.eta_minutes)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [incident])

  // Tier escalation timer (15 seconds)
  useEffect(() => {
    if (acknowledgedResponder || escalated || falseAlarm) return

    const timer = setTimeout(async () => {
      // Check if any acknowledged
      const hasAck = broadcasts.some(b => b.status === 'acknowledged')
      if (!hasAck) {
        const success = await escalateBroadcasts(incident.id, currentTier)
        if (success) {
          setCurrentTier(prev => prev + 1)
          setEscalated(true)
        }
      }
    }, ESCALATION_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [broadcasts, acknowledgedResponder, currentTier, escalated, incident, falseAlarm])

  const handleFalseAlarm = async () => {
    if (!supabase) return
    setFalseAlarm(true)
    await supabase
      .from('incidents')
      .update({ status: 'false_alarm', outcome: 'false' })
      .eq('id', incident.id)
    onReset()
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <h1>Emergency Broadcast Status</h1>

      {acknowledgedResponder ? (
        <div className="card" style={{ background: '#dcfce8', borderColor: '#16a34a', marginBottom: '16px' }}>
          <h2 style={{ color: '#166534', margin: '0 0 8px' }}>✓ Responder Accepted</h2>
          <p style={{ fontSize: '18px', fontWeight: 600 }}>{acknowledgedResponder}</p>
          <p style={{ fontSize: '16px' }}>Estimated Arrival (ETA): <strong>{eta || 10} minutes</strong></p>
        </div>
      ) : (
        <div className="card" style={{ background: '#fef3c7', borderColor: '#d97706', marginBottom: '16px' }}>
          <h2 style={{ color: '#92400e', margin: '0 0 8px' }}>🚨 Alert Broadcasted (Tier {currentTier})</h2>
          <p>Waiting for doctor or responder acknowledgement...</p>
          <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', margin: '12px auto 0' }}></div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Alerted Responders ({broadcasts.length})</h3>
        {broadcasts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No responders alerted yet (or corroboration rule pending).</p>}
        {broadcasts.map((b) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{b.responders?.display_name || 'Responder'}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.responders?.specialty || 'General'} (Tier {b.tier})</div>
            </div>
            <div>
              <span style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                background: b.status === 'acknowledged' ? '#dcfce8' : b.status === 'sent' ? '#fef3c7' : '#fee2e2',
                color: b.status === 'acknowledged' ? '#166534' : b.status === 'sent' ? '#92400e' : '#991b1b'
              }}>
                {b.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn btn-primary" onClick={onStartProtocol}>
          START FIRST-AID PROTOCOL GUIDANCE
        </button>

        <button className="btn btn-outline" onClick={handleFalseAlarm} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          This was a False Alarm
        </button>

        <button className="btn btn-outline" onClick={onReset}>
          Back to Home
        </button>
      </div>
    </div>
  )
}
