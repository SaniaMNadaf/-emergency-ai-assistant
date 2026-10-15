import { forwardRef } from 'react'

export const Toast = forwardRef(function Toast(
  { children, variant = 'info', duration = 3000, onClose, ...rest },
  ref
) {
  if (!children) return null

  const variantClass = {
    info: 'banner-info',
    success: 'banner-online',
    warning: 'banner-warning',
    error: 'banner-error',
  }[variant] || 'banner-info'

  return (
    <div
      ref={ref}
      className={`banner ${variantClass} toast`}
      style={{
        position: 'fixed',
        bottom: 'var(--sp-4)',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100% - 32px)',
        zIndex: 1000,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideIn 0.3s ease-out',
      }}
      {...rest}
    >
      {children}
    </div>
  )
})
