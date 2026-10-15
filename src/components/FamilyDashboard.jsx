import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { AlertTriangle, LogOut, Settings } from 'lucide-react'

export default function FamilyDashboard({ user, onOpenDemoPanel, onLogout }) {
  const [hasAccess, setHasAccess] = useState(false)
  const [patient, setPatient] = useState(null)
  const [readings, setReadings] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAccessAndLoad() {
      if (!supabase) return

      const { data: linkData } = await supabase
        .from('care_links')
        .select('*, users!care_links_patient_id_fkey(*)')
        .eq('family_id', user.id)
        .eq('active', true)
        .single()

      if (linkData && linkData.users) {
        setHasAccess(true)
        const pat = linkData.users
        setPatient(pat)

        const { data: rData } = await supabase
          .from('readings')
          .select('*')
          .eq('patient_id', pat.id)
          .order('taken_at', { ascending: false })
          .limit(10)
        if (rData) setReadings(rData)

        const { data: iData } = await supabase
          .from('incidents')
          .select('*')
          .eq('reporter_id', pat.id)
          .order('created_at', { ascending: false })
        if (iData) setIncidents(iData)

        await supabase.from('access_log').insert({
          patient_id: pat.id,
          viewer_id: user.id,
          what: 'patient dashboard readings & status',
          viewed_at: new Date().toISOString()
        })
      } else {
        setHasAccess(false)
      }
      setLoading(false)
    }
    checkAccessAndLoad()
  }, [user])

  useEffect(() => {
    if (!supabase || !patient) return
    const channel = supabase
      .channel(`family-patient-${patient.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents', filter: `reporter_id=eq.${patient.id}` },
        (payload) => {
          if (payload.new) {
            setIncidents(prev => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patient])

  if (loading) return (
    <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-3)' }}>Checking care link access...</p>
    </div>
  )

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)', textAlign: 'center' }}>
        <Card title="No access" style={{ textAlign: 'center', padding: 'var(--sp-8) var(--sp-5)' }}>
          <h2>No access</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>You do not have an active care link to any patient, or access has been revoked.</p>
          <Button variant="outline" onClick={onLogout} style={{ marginTop: 'var(--sp-4)' }}>
            <LogOut size={16} style={{ marginRight: 'var(--sp-1)' }} />
            Logout
          </Button>
        </Card>
      </div>
    )
  }

  const latestMedication = readings.find(r => r.type === 'medication')
  const isMedicationTaken = latestMedication && String(latestMedication.value) === '1'

  return (
    <div style={{ paddingBottom: 'var(--sp-16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{patient?.name || 'Patient'} Dashboard</h2>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Linked Family View</span>
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

      {incidents.filter(i => i.status === 'open' || i.status === 'acknowledged').length > 0 && (
        <Card style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)', marginBottom: 'var(--sp-4)' }}>
          <h2 style={{ color: 'var(--color-danger)', margin: '0 0 var(--sp-2)' }}>🚨 ACTIVE EMERGENCY ALERT</h2>
          <p>Your linked patient has triggered an emergency alert!</p>
        </Card>
      )}

      <Card title="Medication Status" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {latestMedication ? (
            <>
              <Badge variant={isMedicationTaken ? 'ok' : 'declined'} style={{ fontSize: 'var(--font-size-sm)' }}>
                {isMedicationTaken ? '✓ Taken' : '✕ Skipped'}
              </Badge>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                as of {new Date(latestMedication.taken_at).toLocaleTimeString()}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No status recorded today</span>
          )}
        </div>
      </Card>

      <Card title="Latest Readings">
        {readings.filter(r => r.type !== 'medication').length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No readings recorded yet.</p>
        ) : (
          readings.filter(r => r.type !== 'medication').map((r) => (
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
                <strong style={{ textTransform: 'uppercase', fontSize: 'var(--font-size-sm)' }}>{r.type.replace('_', ' ')}</strong>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(r.taken_at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: r.abnormal ? 'var(--color-danger)' : 'var(--color-text)' }}>
                  {r.value}
                </span>
                {r.abnormal && (
                  <Badge variant="abnormal" style={{ display: 'block', marginTop: 'var(--sp-1)', fontSize: 'var(--font-size-xs)' }}>
                    ABNORMAL
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
