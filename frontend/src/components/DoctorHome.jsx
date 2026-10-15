import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { LogOut, Settings, Bell, CheckCheck } from 'lucide-react'

export default function DoctorHome({ user, onOpenAlert, onOpenDemoPanel, onLogout }) {
  const [responder, setResponder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pastResponses, setPastResponses] = useState([])
  const [stats, setStats] = useState({ count: 0, avgSeconds: 0 })

  const onOpenAlertRef = useRef(onOpenAlert)
  useEffect(() => {
    onOpenAlertRef.current = onOpenAlert
  }, [onOpenAlert])

  useEffect(() => {
    async function loadDoctorData() {
      if (!supabase) return
      const { data: resp } = await supabase
        .from('responders')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (resp) {
        setResponder(resp)
        const { data: broadcasts } = await supabase
          .from('broadcasts')
          .select('*, incidents(created_at, has_photo)')
          .eq('responder_id', resp.id)
          .order('sent_at', { ascending: false })
          .limit(10)

        if (broadcasts) {
          setPastResponses(broadcasts)
          const acknowledged = broadcasts.filter(b => b.status === 'acknowledged' && b.acknowledged_at && b.sent_at)
          const count = acknowledged.length
          let totalSec = 0
          acknowledged.forEach(b => {
            const diff = (new Date(b.acknowledged_at) - new Date(b.sent_at)) / 1000
            if (diff > 0 && diff < 3600) totalSec += diff
          })
          const avgSeconds = count > 0 ? Math.round(totalSec / count) : 0
          setStats({ count, avgSeconds })
        }
      }
      setLoading(false)
    }
    loadDoctorData()
  }, [user])

  useEffect(() => {
    if (!supabase || !responder) return

    const channel = supabase
      .channel(`doctor-${responder.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts', filter: `responder_id=eq.${responder.id}` },
        (payload) => {
          if (payload.new && payload.new.status === 'sent') {
            onOpenAlertRef.current?.(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [responder])

  const toggleAvailability = async () => {
    if (!supabase || !responder) return
    const newAvail = !responder.available
    const { error } = await supabase
      .from('responders')
      .update({ available: newAvail })
      .eq('id', responder.id)

    if (!error) {
      setResponder(prev => ({ ...prev, available: newAvail }))
    }
  }

  if (loading) return (
    <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-3)' }}>Loading responder profile...</p>
    </div>
  )

  const isAvailable = responder?.available ?? false

  return (
    <div style={{ paddingBottom: 'var(--sp-20)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{responder?.display_name || user.name}</h2>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {responder?.specialty || 'Doctor / Responder'} (Tier {responder?.tier || 1})
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onOpenDemoPanel} aria-label="Demo panel">
            <Settings size={20} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onLogout} aria-label="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: 'var(--sp-2)' }}>Availability Status</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            {isAvailable ? 'You are receiving emergency alerts.' : 'You are currently offline / unavailable.'}
          </p>
        </div>
        <Button
          variant={isAvailable ? 'primary' : 'outline'}
          onClick={toggleAvailability}
          style={{ minWidth: '120px' }}
        >
          {isAvailable ? 'AVAILABLE' : 'OFFLINE'}
        </Button>
      </Card>

      <Card title="Participation Score" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-3)' }}>
          <div style={{ flex: 1, background: 'var(--color-bg)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>{stats.count}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Responses</div>
          </div>
          <div style={{ flex: 1, background: 'var(--color-bg)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>{stats.avgSeconds}s</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Avg Response</div>
          </div>
        </div>
      </Card>

      <Card title="Recent Alerts">
        {pastResponses.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No responses recorded yet.</p>
        )}
        {pastResponses.map((b) => (
          <div
            key={b.id}
            style={{
              padding: 'var(--sp-2) 0',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div>Tier {b.tier} Alert</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {new Date(b.sent_at).toLocaleTimeString()}
              </div>
            </div>
            <Badge variant={b.status === 'acknowledged' ? 'ack' : 'declined'}>
              {b.status}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
