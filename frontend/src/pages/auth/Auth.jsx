import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Eye, EyeOff, Lock, Mail, Shield, Radio, HeartPulse, Stethoscope, Users, User, Phone } from 'lucide-react'

export default function Auth() {
  const { login, DEMO_ACCOUNTS, DEMO_PASSWORD } = useAuth()
  const [emailInput, setEmailInput] = useState('bystander@pulserescue.org')
  const [passwordInput, setPasswordInput] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const demoMode = !isSupabaseConfigured()

  const handleCustomLogin = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(emailInput.trim(), passwordInput)
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleQuickLogin = async (account) => {
    setEmailInput(account.email)
    setLoading(true)
    setError(null)
    try {
      await login(account.email, DEMO_PASSWORD)
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e14',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--font-family)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Top Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '16px',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(18, 24, 34, 0.9) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.35)',
          }}>
            <Shield size={32} color="#ef4444" style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' }} />
          </div>

          <h1 style={{
            margin: '0 0 6px',
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <span>Pulse</span>
            <span style={{ color: '#ef4444' }}>Rescue</span>
          </h1>

          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#8492a6',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Smart Emergency Coordination
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(18, 24, 34, 0.8)',
            border: '1px solid #1e2837',
            borderRadius: '9999px',
            fontSize: '12px',
            color: '#10b981',
            fontWeight: 500,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            System Online {demoMode && '• Demo Sync'}
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Responder Sign In Card */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '18px',
          padding: '24px 20px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle top emergency bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
          }} />

          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#f8fafc' }}>
            Responder Sign In
          </h2>
          <p style={{ fontSize: '13px', color: '#8492a6', margin: '0 0 20px' }}>
            Access dispatch console & coordination feeds
          </p>

          <form onSubmit={handleCustomLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Email or Responder ID
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#0a0e14',
                border: '1px solid #1e2837',
                borderRadius: '10px',
                padding: '0 12px',
              }}>
                <Mail size={16} color="#64748b" style={{ marginRight: '8px', flexShrink: 0 }} />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="bystander@pulserescue.org"
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setPasswordInput(DEMO_PASSWORD)}
                  style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#0a0e14',
                border: '1px solid #1e2837',
                borderRadius: '10px',
                padding: '0 12px',
              }}>
                <Lock size={16} color="#64748b" style={{ marginRight: '8px', flexShrink: 0 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ accentColor: '#ef4444', width: '14px', height: '14px' }}
                />
                Keep me signed in
              </label>

              <button
                type="button"
                onClick={() => {
                  const bystander = DEMO_ACCOUNTS.find(a => a.role === 'bystander')
                  if (bystander) handleRoleQuickLogin(bystander)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#fca5a5',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <span>🪪</span> Biometrics
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.45)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In →
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick Access Demo Roles Section */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#f8fafc', textTransform: 'uppercase' }}>
                QUICK ACCESS DEMO
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Role
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {DEMO_ACCOUNTS.map((acct) => {
              const icons = {
                bystander: <Radio size={18} color="#ef4444" />,
                doctor: <Stethoscope size={18} color="#ef4444" />,
                police: <Shield size={18} color="#06b6d4" />,
                family: <Users size={18} color="#f59e0b" />,
                patient: <HeartPulse size={18} color="#10b981" />,
              }
              const subtitles = {
                bystander: 'Report Incident',
                doctor: 'Emergency Triage',
                police: 'Metro CAD Dispatch',
                family: 'Contact Liaison',
                patient: 'SOS Beacon',
              }

              return (
                <button
                  key={acct.id}
                  onClick={() => !loading && handleRoleQuickLogin(acct)}
                  disabled={loading}
                  style={{
                    backgroundColor: '#121822',
                    border: '1px solid #1e2837',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2e3d52'
                    e.currentTarget.style.backgroundColor = '#18202d'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e2837'
                    e.currentTarget.style.backgroundColor = '#121822'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#0a0e14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {icons[acct.role] || <User size={18} color="#ef4444" />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {acct.role === 'doctor' ? 'Doctor' : acct.role === 'police' ? 'Police' : acct.role}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8492a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {subtitles[acct.role] || acct.role}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Direct Call */}
        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#8492a6' }}>
          <span style={{ color: '#ef4444', fontWeight: 800 }}>SOS</span>
          <span>Immediate emergency?</span>
          <a
            href="tel:911"
            style={{
              color: '#f8fafc',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Call 911 <Phone size={12} color="#ef4444" />
          </a>
        </div>
      </div>
    </div>
  )
}
