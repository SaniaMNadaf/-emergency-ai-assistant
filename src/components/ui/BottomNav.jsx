import { forwardRef } from 'react'
import { Home, BarChart2, FileText, Bell } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Home', value: 'home' },
  { icon: BarChart2, label: 'Status', value: 'status' },
  { icon: FileText, label: 'Protocols', value: 'protocols' },
  { icon: Bell, label: 'Alerts', value: 'alerts' },
]

export const BottomNav = forwardRef(function BottomNav(
  { current = 'home', onChange, className = '', ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bottom-nav ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '768px',
        margin: '0 auto',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 'var(--sp-3) 0',
        boxShadow: 'var(--shadow-lg)',
      }}
      {...rest}
    >
      {navItems.map((item) => {
        const isActive = item.value === current
        const Icon = item.icon
        return (
          <button
            key={item.value}
            className="btn btn-ghost btn-icon"
            style={{
              flex: 1,
              flexDirection: 'column',
              gap: 'var(--sp-1)',
              background: 'transparent',
              border: 'none',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: 'var(--font-size-xs)',
              padding: 'var(--sp-2) 0',
            }}
            onClick={() => onChange && onChange(item.value)}
            aria-label={item.label}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
})
