import { forwardRef } from 'react'

const variantClasses = {
  tier1: 'badge-tier1',
  tier2: 'badge-tier2',
  tier3: 'badge-tier3',
  ack: 'badge-ack',
  sent: 'badge-sent',
  declined: 'badge-declined',
  abnormal: 'badge-abnormal',
  ok: 'badge-ok',
  success: 'badge-ok',
  danger: 'badge-declined',
  warning: 'badge-warning',
}

export const Badge = forwardRef(function Badge(
  { children, variant = 'sent', className = '', ...rest },
  ref
) {
  const badgeClass = variantClasses[variant] || 'badge-sent'
  return (
    <span ref={ref} className={`badge ${badgeClass} ${className}`} {...rest}>
      {children}
    </span>
  )
})
