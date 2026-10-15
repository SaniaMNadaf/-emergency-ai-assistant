import { forwardRef } from 'react'

export const Card = forwardRef(function Card(
  { children, title, className = '', elevated = false, interactive = false, onClick, ...rest },
  ref
) {
  const classes = ['card', elevated ? 'card-elevated' : '', interactive ? 'card-interactive' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes} onClick={onClick} {...rest}>
      {title && <h3 style={{ margin: 0, marginBottom: 'var(--sp-3)', fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{title}</h3>}
      {children}
    </div>
  )
})
