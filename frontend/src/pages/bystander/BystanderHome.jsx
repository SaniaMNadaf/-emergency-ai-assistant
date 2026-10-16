import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { AlertCircle } from 'lucide-react'

export default function BystanderHome({ user, onStartEmergency, onStartProtocol, onOpenDemoPanel, onLogout }) {
  return (
    <div style={{ paddingBottom: 'var(--sp-20)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{user.name}</h2>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Emergency Bystander</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onOpenDemoPanel} aria-label="Demo panel">
            🛠️
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onLogout} aria-label="Logout">
            🚪
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <div style={{ position: 'relative', marginBottom: 'var(--sp-4)' }}>
          <div
            style={{
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-hover) 100%)',
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
              gap: 'var(--sp-2)',
              transition: 'all 0.1s',
              animation: 'pulse 2s ease-in-out infinite',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onClick={onStartEmergency}
            aria-label="Report Emergency — Tap to alert responders"
          >
            <span style={{ fontSize: '64px' }}>🚨</span>
            <span style={{ fontSize: '24px' }}>EMERGENCY</span>
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              left: '-12px',
              right: '-12px',
              bottom: '-12px',
              borderRadius: '50%',
              border: '4px solid var(--color-danger)',
              animation: 'pulse-ring 2s linear infinite',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
        </div>
        <p style={{ marginTop: 'var(--sp-2)', color: 'var(--color-text-muted)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
          Tap to report incident, capture GPS & photo, and alert doctors.
        </p>
      </div>

      <Card title="First Aid Protocols" style={{ marginBottom: 'var(--sp-4)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-3)' }}>
          Offline decision trees that work without internet.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <Button variant="outline" size="md" onClick={() => onStartProtocol('cpr')}>
            ❤️ CPR (Cardiopulmonary Resuscitation)
          </Button>
          <Button variant="outline" size="md" onClick={() => onStartProtocol('bleeding')}>
            🩸 Severe Bleeding Control
          </Button>
          <Button variant="outline" size="md" onClick={() => onStartProtocol('choking')}>
            🗣️ Choking (Adult Heimlich)
          </Button>
        </div>
      </Card>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 10px 35px rgba(220, 38, 38, 0.6); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.6; }
          70% { transform: scale(1.3); opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
