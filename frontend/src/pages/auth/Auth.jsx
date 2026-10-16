import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const roleIcons = {
  bystander: '\uD83E\uDE80',
  doctor: '\uD83D\uDC68\u200D\uD83C\uDFEB\u2611\uFE0F',
  family: '\uD83D\uDC6B',
  patient: '\uD83E\uDEE0',
}

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
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--sp-2)' }}>🩺</div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-3xl)' }}>Emergency Assistant</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-2)', fontSize: 'var(--font-size-sm)' }}>
            Choose your role to begin
          </p>
        </div>

        {demoMode && (
          <div className="banner banner-info" style={{ marginBottom: 'var(--sp-4)' }}>
            <span>🧪 Demo mode: Supabase not configured. Using mock auth.</span>
          </div>
        )}

        {error && <div className="banner banner-error" style={{ marginBottom: 'var(--sp-4)' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {DEMO_ACCOUNTS.map((acct) => (
            <Card
              key={acct.id}
              className="account-card"
              interactive
              onClick={() => !loading && handleLogin(acct.email)}
              style={{ cursor: loading ? 'default' : 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <span style={{ fontSize: '32px' }}>{roleIcons[acct.role] || '\uD83D\uDC64'}</span>
                <div style={{ flex: 1 }}>
                  <div className="account-role">{acct.role.charAt(0).toUpperCase() + acct.role.slice(1)}</div>
                  <div className="account-name">{acct.name}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{acct.email}</div>
                </div>
                <Badge variant="tier1">{`Password: ${DEMO_PASSWORD}`}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--sp-2)' }}>Signing in...</p>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--sp-4)' }}>
          Demo password: <code style={{ background: 'var(--color-border)', padding: '2px 6px', borderRadius: '4px' }}>{DEMO_PASSWORD}</code>
        </p>
      </div>
    </div>
  )
}
