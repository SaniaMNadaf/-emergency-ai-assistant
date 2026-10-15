import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Banner } from './ui/Banner'
import { Plus, Check, X, Trash2, Settings, LogOut } from 'lucide-react'

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
    const { data: rData } = await supabase
      .from('readings')
      .select('*')
      .eq('patient_id', user.id)
      .order('taken_at', { ascending: false })
      .limit(10)
    if (rData) setReadings(rData)

    const { data: cData } = await supabase
      .from('care_links')
      .select('*, users!care_links_family_id_fkey(name, email)')
      .eq('patient_id', user.id)
    if (cData) setCareLinks(cData)

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
    <div style={{ paddingBottom: 'var(--sp-16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{user.name}</h2>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Patient Dashboard</span>
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

      {message && <Banner variant={message.includes('Error') ? 'error' : 'success'} style={{ marginBottom: 'var(--sp-4)' }}>{message}</Banner>}

      <Card title="Medication Status" style={{ marginBottom: 'var(--sp-4)' }}>
        <p style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Confirm daily medication status</p>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Button variant="success" icon={Check} onClick={() => handleMedication(true)}>Taken</Button>
          <Button variant="danger" icon={X} onClick={() => handleMedication(false)}>Skipped</Button>
        </div>
      </Card>

      <Card title="Add Health Reading" style={{ marginBottom: 'var(--sp-4)' }}>
        <form onSubmit={handleAddReading}>
          <select className="input" value={readingType} onChange={(e) => setReadingType(e.target.value)}>
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
          <Button type="submit" variant="primary">
            Save Reading
          </Button>
        </form>
      </Card>

      <Card title="Family & Consent Links" style={{ marginBottom: 'var(--sp-4)' }}>
        <form onSubmit={handleInviteFamily} style={{ marginBottom: 'var(--sp-3)' }}>
          <input
            type="email"
            className="input"
            placeholder="family@demo.com"
            value={familyEmail}
            onChange={(e) => setFamilyEmail(e.target.value)}
          />
          <Button type="submit" variant="outline">Invite Family Member</Button>
        </form>

        {careLinks.length === 0 && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No family members linked yet.</p>
        )}
        {careLinks.map((link) => (
          <div
            key={link.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--sp-2) 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              <strong>{link.users?.name || link.users?.email}</strong>
              <Badge variant={link.active ? 'ok' : 'declined'} style={{ marginLeft: 'var(--sp-1)', fontSize: 'var(--font-size-xs)' }}>
                {link.active ? 'Active' : 'Revoked'}
              </Badge>
            </div>
            {link.active && (
              <button
                className="btn btn-danger btn-sm btn-icon"
                style={{ minWidth: 'auto', padding: 'var(--sp-1) var(--sp-2)' }}
                onClick={() => handleRevoke(link.id)}
                aria-label="Revoke access"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </Card>

      <Card title="Access Log">
        {accessLog.length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No access logs yet.</p>
        ) : (
          accessLog.map((log) => (
            <div
              key={log.id}
              style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--sp-1) 0', borderBottom: '1px solid var(--color-border)' }}
            >
              <strong>{log.users?.name || 'Viewer'}</strong> viewed {log.what} at {new Date(log.viewed_at).toLocaleTimeString()}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
