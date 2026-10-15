import { useAuth } from '../lib/auth'

export default function Home({ user }) {
  const { logout } = useAuth()

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
      <div className="card">
        <h2>Welcome, {user?.name || 'User'}</h2>
        <p>Role: <strong>{user?.role}</strong></p>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Full dashboard coming in the next build blocks.
        </p>
      </div>

      <button className="btn btn-outline" onClick={logout} style={{ marginTop: '12px' }}>
        Log Out
      </button>
    </div>
  )
}
