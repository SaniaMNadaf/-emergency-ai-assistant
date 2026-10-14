import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Auth() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (email) => {
    setLoading(true)
    setError(null)
    try {
      await login(email, 'demo')
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

      {error && (
        <div className="banner banner-error" style={{ marginBottom: '16px' }}>{error}</div>
      )}

      <div className="account-card" onClick={() => handleLogin('bystander@demo.com')} style={{ cursor: loading ? 'default' : 'pointer' }}>
        <div className="account-role">Bystander</div>
        <div className="account-name">Emergency Bystander</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>bystander@demo.com</div>
      </div>

      <div className="account-card" onClick={() => handleLogin('doctor@demo.com')} style={{ cursor: loading ? 'default' : 'pointer' }}>
        <div className="account-role">Doctor / Responder</div>
        <div className="account-name">Dr. Sarah Chen</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>doctor@demo.com</div>
      </div>

      <div className="account-card" onClick={() => handleLogin('family@demo.com')} style={{ cursor: loading ? 'default' : 'pointer' }}>
        <div className="account-role">Family Member</div>
        <div className="account-name">Family Member</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>family@demo.com</div>
      </div>

      {loading && <div style={{ textAlign: 'center', marginTop: '16px' }}>Signing you in...</div>}
    </div>
  )
}
