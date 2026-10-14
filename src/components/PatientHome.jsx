import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PatientHome({ user, onOpenDemoPanel, onLogout }) {
  const [_, setReadings] = useState([])
  const [readingType, setReadingType] = useState('bp_systolic')
  const [readingValue, setReadingValue] = useState('')
  const [familyEmail, setFamilyEmail] = useState('')
  const [careLinks, setCareLinks] = useState([])
  const [accessLog, setAccessLog] = useState([])
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadPatientData()
  }, [user])

  async function loadPatientData() {
    if (!supabase) return
    // Load readings
    const { data: rData } = await supabase
      .from('readings')
      .select('*')
      .eq('patient_id', user.id)
      .order('taken_at', { ascending: false })
      .limit(10)
    if (rData) setReadings(rData)

    // Load care links
    const { data: cData } = await supabase
      .from('care_links')
      .select('*, users!care_links_family_id_fkey(name, email)')
      .eq('patient_id', user.id)
    if (cData) setCareLinks(cData)

    // Load access log
    const { data: aData } = await supabase
      .from('access_log')
      .select('*, users!access_log_viewer_id_fkey(name, email)')
      .eq('patient_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(10)
    if (aData) setAccessLog(aData)
  }

  const handleAddReading = async (e) => {
    e.preventDefault()
    if (!supabase || !readingValue) return

    const val = parseFloat(readingValue)
    let abnormal = false
    if (readingType === 'bp_systolic' && (val > 140 || val < 90)) abnormal = true
    if (readingType === 'blood_sugar' && (val > 180 || val < 70)) abnormal = true
    if (readingType === 'spo2' && val < 95) abnormal = true

    const { error } = await supabase.from('readings').insert({
      patient_id: user.id,
      type: readingType,
      value: val,
      abnormal,
      taken_at: new Date().toISOString()
    })

    if (!error) {
      setReadingValue('')
      setMessage('Reading saved successfully')
      loadPatientData()
    } else {
      setMessage(`Error: ${error.message}`)
    }
  }

  const handleMedication = async (taken) => {
    if (!supabase) return
    await supabase.from('readings').insert({
      patient_id: user.id,
      type: 'medication',
      value: taken ? 1 : 0,
      abnormal: false,
      taken_at: new Date().toISOString()
    })
    setMessage(taken ? 'Medication marked as Taken' : 'Medication marked as Skipped')
    loadPatientData()
  }

  const handleInviteFamily = async (e) => {
    e.preventDefault()
    if (!supabase || !familyEmail) return

    // Find user by email with role 'family'
    const { data: familyUser, error: fErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', familyEmail)
      .eq('role', 'family')
      .single()

    if (fErr || !familyUser) {
      setMessage('Family user not found with that email and family role.')
      return
    }

    const { error } = await supabase.from('care_links').insert({
      patient_id: user.id,
      family_id: familyUser.id,
      active: true,
      granted_at: new Date().toISOString()
    })

    if (!error) {
      setFamilyEmail('')
      setMessage('Family member linked successfully!')
      loadPatientData()
    } else {
      setMessage(`Error linking family: ${error.message}`)
    }
  }

  const handleRevoke = async (linkId) => {
    if (!supabase) return
    await supabase
      .from('care_links')
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq('id', linkId)
    setMessage('Care link revoked.')
    loadPatientData()
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{user.name}</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Patient Dashboard</span>
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

      {message && <div className="banner banner-online" style={{ marginBottom: '16px' }}>{message}</div>}

      {/* Medication Quick Confirm */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Medication Status</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={() => handleMedication(true)} style={{ background: 'var(--success)' }}>
            ✓ Confirm Taken
          </button>
          <button className="btn btn-danger" onClick={() => handleMedication(false)}>
            ✕ Skip
          </button>
        </div>
      </div>

      {/* Add Reading */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Add Health Reading</h3>
        <form onSubmit={handleAddReading}>
          <select
            className="input"
            value={readingType}
            onChange={(e) => setReadingType(e.target.value)}
          >
            <option value="bp_systolic">Blood Pressure (Systolic)</option>
            <option value="blood_sugar">Blood Sugar (mg/dL)</option>
            <option value="spo2">Blood Oxygen SpO2 (%)</option>
          </select>
          <input
            type="number"
            className="input"
            placeholder="Enter value..."
            value={readingValue}
            onChange={(e) => setReadingValue(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Save Reading</button>
        </form>
      </div>

      {/* Family & Consent */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>Family & Consent Links</h3>
        <form onSubmit={handleInviteFamily} style={{ marginBottom: '12px' }}>
          <input
            type="email"
            className="input"
            placeholder="family@demo.com"
            value={familyEmail}
            onChange={(e) => setFamilyEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">Invite Family Member</button>
        </form>

        {careLinks.map((link) => (
          <div key={link.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong>{link.users?.name || link.users?.email}</strong>
              <div style={{ fontSize: '12px', color: link.active ? 'var(--success)' : 'var(--danger)' }}>
                {link.active ? 'Active' : 'Revoked'}
              </div>
            </div>
            {link.active && (
              <button className="btn btn-danger" style={{ width: 'auto', padding: '6px 12px', fontSize: '14px' }} onClick={() => handleRevoke(link.id)}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Access Log */}
      <div className="card">
        <h3>Access Log</h3>
        {accessLog.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No access logs yet.</p>}
        {accessLog.map((log) => (
          <div key={log.id} style={{ fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <strong>{log.users?.name || 'Viewer'}</strong> viewed {log.what} at {new Date(log.viewed_at).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  )
}
