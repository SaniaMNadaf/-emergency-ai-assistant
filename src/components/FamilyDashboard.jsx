import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

  if (loading) return <div className="card text-center">Checking care link access...</div>

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '40px 20px' }}>
          <h2>No access</h2>
          <p style={{ color: 'var(--text-muted)' }}>You do not have an active care link to any patient, or access has been revoked.</p>
        </div>
        <button className="btn btn-outline" onClick={onLogout} style={{ marginTop: '16px' }}>Logout</button>
      </div>
    )
  }

  const latestMedication = readings.find(r => r.type === 'medication')
  const isMedicationTaken = latestMedication && String(latestMedication.value) === '1'

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{patient?.name || 'Patient'} Dashboard</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Linked Family View</span>
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

      {incidents.filter(i => i.status === 'open' || i.status === 'acknowledged').length > 0 && (
        <div className="card" style={{ background: '#fee2e2', borderColor: '#dc2626', marginBottom: '16px' }}>
          <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>🚨 ACTIVE EMERGENCY ALERT</h2>
          <p>Your linked patient has triggered an emergency alert!</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Medication Status</h3>
        <p style={{ fontSize: '16px', fontWeight: 600 }}>
          {latestMedication ? (isMedicationTaken ? '✓ Taken' : '✕ Skipped') : 'No status recorded today'}
        </p>
      </div>

      <div className="card">
        <h3>Latest Readings</h3>
        {readings.filter(r => r.type !== 'medication').length === 0 && <p style={{ color: 'var(--text-muted)' }}>No readings recorded yet.</p>}
        {readings.filter(r => r.type !== 'medication').map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong style={{ textTransform: 'uppercase' }}>{r.type.replace('_', ' ')}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.taken_at).toLocaleTimeString()}</div>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: r.abnormal ? 'var(--danger)' : 'var(--text)' }}>
                {r.value}
              </span>
              {r.abnormal && <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>ABNORMAL</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
