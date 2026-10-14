import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Auth() {
  const { login, DEMO_ACCOUNTS, DEMO_PASSWORD } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const demoMode = !isSupabaseConfigured()

  const handleLogin = async (email) => {
    setLoading(true)
    setError(null)
    try {
      await login(email, DEMO_PASSWORD)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>Emergency Assistant</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' }}>
        Choose your role to begin
      </p>

      {demoMode && (
        <div className="banner banner-offline" style={{ marginBottom: '16px', backgroundColor: '#eff6ff', color: '#1e40af', borderColor: '#3b82f6' }}>
          Demo mode: Supabase not configured. Using mock auth.
        </div>
      )}

      {error && (
        <div className="banner banner-error" style={{ marginBottom: '16px' }}>{error}</div>
      )}

      {DEMO_ACCOUNTS.map((acct) => (
        <div
          key={acct.id}
          className="account-card"
          onClick={() => !loading && handleLogin(acct.email)}
          style={{ cursor: loading ? 'default' : 'pointer' }}
        >
          <div className="account-role">{acct.role.charAt(0).toUpperCase() + acct.role.slice(1)}</div>
          <div className="account-name">{acct.name}</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{acct.email}</div>
        </div>
      ))}

      {loading && <div style={{ textAlign: 'center', marginTop: '16px' }}>Signing you in...</div>}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px' }}>
        Demo password: <code>{DEMO_PASSWORD}</code>
      </p>
    </div>
  )
}
