import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { escalateBroadcasts, ESCALATION_INTERVAL_MS } from '../lib/broadcast'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { StatusStepper } from './ui/StatusStepper'
import { Clock, MapPin, Phone } from 'lucide-react'

const stepperSteps = [
  { label: 'Sent', icon: '✓' },
  { label: 'Tier 1', icon: '1' },
  { label: 'Tier 2', icon: '2' },
  { label: 'Tier 3', icon: '3' },
  { label: 'Accepted', icon: '✓' },
]

export default function StatusScreen({ incident, broadcasts: initialBroadcasts, initialTier = 1, onStartProtocol, onReset }) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts || [])
  const [acknowledgedResponder, setAcknowledgedResponder] = useState(null)
  const [eta, setEta] = useState(null)
  const [currentTier, setCurrentTier] = useState(initialTier)
  const [falseAlarm, setFalseAlarm] = useState(false)
  const [countdown, setCountdown] = useState(ESCALATION_INTERVAL_MS / 1000)

  const incidentRef = useRef(incident)
  const currentTierRef = useRef(currentTier)

  useEffect(() => {
    incidentRef.current = incident
    currentTierRef.current = currentTier
  }, [incident, currentTier])

  useEffect(() => {
    if (!supabase || !incident) return

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
        async () => {
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

  useEffect(() => {
    if (acknowledgedResponder || falseAlarm || currentTier >= 3) return
    if (broadcasts.some(b => b.status === 'acknowledged')) return

    const timer = setTimeout(async () => {
      const hasAck = broadcasts.some(b => b.status === 'acknowledged')
      if (hasAck) return

      const { success, nextTier } = await escalateBroadcasts(incidentRef.current.id, currentTierRef.current)
      if (success) {
        setCurrentTier(nextTier)
      }
    }, ESCALATION_INTERVAL_MS)

    const interval = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1
        return newCount <= 0 ? ESCALATION_INTERVAL_MS / 1000 : newCount
      })
    }, 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [broadcasts, acknowledgedResponder, currentTier, falseAlarm, incident])

  const handleFalseAlarm = async () => {
    if (!supabase) return
    setFalseAlarm(true)
    await supabase
      .from('incidents')
      .update({ status: 'false_alarm', outcome: 'false' })
      .eq('id', incident.id)
    onReset()
  }

  const acceptedStep = acknowledgedResponder ? 4 : currentTier - 1
  const activeStep = acknowledgedResponder ? 4 : currentTier

  return (
    <div style={{ paddingBottom: 'var(--sp-20)' }}>
      <h1>Emergency Broadcast Status</h1>

      {acknowledgedResponder ? (
        <Card style={{ background: 'var(--color-success-light)', borderColor: 'var(--color-success)', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ color: 'var(--color-success)', margin: '0 0 var(--sp-2)' }}>✓ Responder Accepted</h2>
          <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>{acknowledgedResponder}</p>
          <p style={{ fontSize: 'var(--font-size-lg)', marginTop: 'var(--sp-2)' }}>Estimated Arrival (ETA): <strong>{eta || 10} minutes</strong></p>
        </Card>
      ) : (
        <Card style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ color: 'var(--color-warning)', margin: '0 0 var(--sp-2)' }}>🚨 Alert Broadcasted (Tier {currentTier})</h2>
          <p>Waiting for doctor or responder acknowledgement...</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', marginTop: 'var(--sp-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            <Clock size={16} />
            <span>Next escalation in {Math.max(0, Math.floor(countdown))}s</span>
          </div>
          <div className="spinner" style={{ width: '24px', height: '24px', margin: 'var(--sp-2) auto 0' }}></div>
        </Card>
      )}

      <Card title="Broadcast Progress" style={{ marginBottom: 'var(--sp-4)' }}>
        <StatusStepper steps={stepperSteps} currentStep={acceptedStep} />
      </Card>

      <Card title="Alerted Responders" style={{ marginBottom: 'var(--sp-4)' }}>
        {broadcasts.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No responders alerted yet.</p>}
        {broadcasts.map((b) => (
          <div
            key={b.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--sp-2) 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <strong>{b.responders?.display_name || 'Responder'}</strong>
                <Badge variant={b.status === 'acknowledged' ? 'ack' : b.status === 'sent' ? 'sent' : 'declined'}>
                  {b.status}
                </Badge>
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {b.responders?.specialty || 'General'} (Tier {b.tier})
              </div>
            </div>
            {b.eta_minutes && (
              <Badge variant="ack">{b.eta_minutes} min ETA</Badge>
            )}
          </div>
        ))}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <Button variant="primary" onClick={onStartProtocol}>
          🏥 START FIRST-AID PROTOCOL GUIDANCE
        </Button>
        <Button variant="ghost" onClick={handleFalseAlarm}>
          This was a False Alarm
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}
