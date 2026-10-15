import { forwardRef } from 'react'

const variantClasses = {
  info: 'banner-info',
  warning: 'banner-warning',
  error: 'banner-error',
  success: 'banner-online',
  offline: 'banner-offline',
}

export const Banner = forwardRef(function Banner(
  { children, variant = 'info', className = '', icon: Icon, ...rest },
  ref
) {
  const bannerClass = variantClasses[variant] || 'banner-info'
  return (
    <div ref={ref} className={`banner ${bannerClass} ${className}`} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.5} />}
      <span>{children}</span>
    </div>
  )
})
