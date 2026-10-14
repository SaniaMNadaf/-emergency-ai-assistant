export default function BystanderHome({ user, onStartEmergency, onStartProtocol, onOpenDemoPanel, onLogout }) {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>{user.name}</h2>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Emergency Bystander</span>
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

      {/* Huge Red Emergency Button */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={onStartEmergency}
          style={{
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: '8px solid #fee2e2',
            fontSize: '24px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.1s, box-shadow 0.1s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '48px' }}>🚨</span>
          EMERGENCY
        </button>
        <p style={{ marginTop: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
          Tap to report incident, capture GPS & photo, and alert doctors.
        </p>
      </div>

      {/* First Aid Protocol Quick Launch */}
      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>Offline First-Aid Protocols</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Pre-written decision trees work completely offline.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => onStartProtocol('cpr')}>
            ❤️ CPR (Cardiopulmonary Resuscitation)
          </button>
          <button className="btn btn-outline" onClick={() => onStartProtocol('bleeding')}>
            🩸 Severe Bleeding Control
          </button>
          <button className="btn btn-outline" onClick={() => onStartProtocol('choking')}>
            🗣️ Choking (Adult Heimlich)
          </button>
        </div>
      </div>
    </div>
  )
}
