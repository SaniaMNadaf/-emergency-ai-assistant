import { forwardRef } from 'react'

export const EmptyState = forwardRef(function EmptyState(
  { icon: Icon, title, description, className = '', ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`empty-state text-center ${className}`}
      style={{
        padding: 'var(--sp-8) var(--sp-5)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}
      {...rest}
    >
      {Icon && (
        <div style={{ marginBottom: 'var(--sp-3)', opacity: 0.4 }}>
          <Icon size={48} strokeWidth={1} />
        </div>
      )}
      {title && (
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--sp-1)' }}>{title}</p>
      )}
      {description && (
        <p style={{ fontSize: 'var(--font-size-xs)' }}>{description}</p>
      )}
    </div>
  )
})
