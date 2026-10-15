import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

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

  // Realtime subscription using useRef so it doesn't re-subscribe on every render
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

  if (loading) return <div className="card text-center">Loading responder profile...</div>

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{responder?.display_name || user.name}</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{responder?.specialty || 'Doctor / Responder'} (Tier {responder?.tier || 1})</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={onOpenDemoPanel} style={{ width: 'auto', padding: '8px 12px', fontSize: '14px' }}>
            Demo Panel
          </button>
          <button className="btn btn-outline" onClick={onLogout} style={{ width: 'auto', padding: '8px 12px', fontSize: '14px' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3>Availability Status</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            {responder?.available ? 'You are receiving emergency alerts.' : 'You are currently offline / unavailable.'}
          </p>
        </div>
        <button
          className={`btn ${responder?.available ? 'btn-primary' : 'btn-outline'}`}
          onClick={toggleAvailability}
          style={{ width: '100px', background: responder?.available ? 'var(--success)' : undefined }}
        >
          {responder?.available ? 'AVAILABLE' : 'OFFLINE'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Participation Score</h3>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          <div style={{ flex: 1, background: 'var(--surface)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>{stats.count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Responses Count</div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>{stats.avgSeconds}s</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Response Time</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Past Responses</h3>
        {pastResponses.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No responses recorded yet.</p>}
        {pastResponses.map((b) => (
          <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div>Tier {b.tier} Alert</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(b.sent_at).toLocaleTimeString()}</div>
            </div>
            <div>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: b.status === 'acknowledged' ? '#dcfce8' : '#fee2e2',
                color: b.status === 'acknowledged' ? '#166534' : '#991b1b'
              }}>
                {b.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
