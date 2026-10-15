import { forwardRef } from 'react'

export const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', icon: Icon, onClick, disabled, loading = false, className = '', ariaLabel, fullWidth = true, ...rest },
  ref
) {
  const variantClass = `btn-${variant}`
  const sizeClass = `btn-${size}`
  const widthClass = fullWidth ? '' : 'btn-inline'
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {loading ? (
        <span className="spinner" style={{ width: '24px', height: '24px', marginRight: children ? 'var(--sp-2)' : 0 }}></span>
      ) : Icon ? (
        <span className="btn-icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: children ? 'var(--sp-2)' : 0 }}>
          <Icon size={20} strokeWidth={1.5} />
        </span>
      ) : null}
      {children}
    </button>
  )
})
