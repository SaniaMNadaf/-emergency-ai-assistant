import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Check, X, Trash2, Settings, LogOut } from 'lucide-react'

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
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '80px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        marginBottom: '16px',
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PATIENT BIOMETRIC PORTAL
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>
            {user.name}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenDemoPanel}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
            aria-label="Demo panel"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={onLogout}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '8px',
              color: '#ef4444',
              cursor: 'pointer',
            }}
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          marginBottom: '16px',
          backgroundColor: message.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${message.includes('Error') ? '#ef4444' : '#10b981'}`,
          color: message.includes('Error') ? '#fca5a5' : '#86efac',
        }}>
          {message}
        </div>
      )}

      {/* Medication Quick Confirm Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#8492a6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
          DAILY SCHEDULE
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
          Confirm Daily Medication
        </h2>
        <p style={{ fontSize: '12px', color: '#8492a6', margin: '0 0 14px' }}>
          Logged directly to emergency responder intake
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => handleMedication(true)}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Check size={16} /> Taken
          </button>
          <button
            onClick={() => handleMedication(false)}
            style={{
              backgroundColor: '#18202d',
              border: '1px solid #2e3d52',
              color: '#ef4444',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <X size={16} /> Skipped
          </button>
        </div>
      </div>

      {/* Add Health Reading Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#06b6d4', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
          BIOMETRIC LOG
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px' }}>
          Add Health Reading
        </h2>

        <form onSubmit={handleAddReading}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              Metric Type
            </label>
            <select
              value={readingType}
              onChange={(e) => setReadingType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#0a0e14',
                border: '1px solid #1e2837',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="bp_systolic">Blood Pressure (Systolic mmHg)</option>
              <option value="blood_sugar">Blood Sugar (mg/dL)</option>
              <option value="spo2">Blood Oxygen SpO2 (%)</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              Value
            </label>
            <input
              type="number"
              placeholder="Enter numeric value..."
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#0a0e14',
                border: '1px solid #1e2837',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            }}
          >
            Save Biometric Reading
          </button>
        </form>
      </div>

      {/* Family & Consent Links */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
          CONSENT & PROXY
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px' }}>
          Family Care Links
        </h2>

        <form onSubmit={handleInviteFamily} style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              placeholder="family@demo.com"
              value={familyEmail}
              onChange={(e) => setFamilyEmail(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#0a0e14',
                border: '1px solid #1e2837',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#18202d',
                border: '1px solid #2e3d52',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Link Proxy
            </button>
          </div>
        </form>

        {careLinks.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#8492a6', margin: 0 }}>No family members linked yet.</p>
        ) : (
          careLinks.map((link) => (
            <div
              key={link.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #1e2837',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                  {link.users?.name || link.users?.email}
                </strong>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: link.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: link.active ? '#10b981' : '#ef4444',
                }}>
                  {link.active ? 'ACTIVE' : 'REVOKED'}
                </span>
              </div>
              {link.active && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  onClick={() => handleRevoke(link.id)}
                  aria-label="Revoke access"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Access Log */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '16px',
        padding: '18px 20px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#8492a6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
          HIPAA AUDIT TRAIL
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px' }}>
          Recent Record Access Log
        </h2>

        {accessLog.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#8492a6', margin: 0 }}>No record access logged.</p>
        ) : (
          accessLog.map((log) => (
            <div
              key={log.id}
              style={{
                fontSize: '12px',
                padding: '8px 0',
                borderBottom: '1px solid #1e2837',
                color: '#cbd5e1',
              }}
            >
              <strong style={{ color: '#f8fafc' }}>{log.users?.name || 'Viewer'}</strong> viewed {log.what} at {new Date(log.viewed_at).toLocaleTimeString()}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
