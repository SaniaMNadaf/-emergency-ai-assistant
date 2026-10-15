import { forwardRef } from 'react'

export const StatusStepper = forwardRef(function StatusStepper(
  { steps, currentStep, className = '', ...rest },
  ref
) {
  const stepSize = 100 / steps.length

  return (
    <div ref={ref} className={`status-stepper ${className}`} style={{ width: '100%', marginBottom: 'var(--sp-5)' }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
        {steps.map((step, idx) => {
          const isActive = idx === currentStep
          const isCompleted = idx < currentStep
          const isLast = idx === steps.length - 1
          const bgColor = isActive
            ? 'var(--color-primary)'
            : isCompleted
              ? 'var(--color-success)'
              : 'var(--color-border)'
          const textColor = isActive || isCompleted ? 'var(--color-primary-contrast)' : 'var(--color-text-muted)'

          return (
            <div key={step.key || step.label} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: bgColor,
                  color: textColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  border: isActive ? '3px solid var(--color-primary-light)' : undefined,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {isCompleted && '✓'}
                {isActive && !isCompleted && step.icon}
                {!isActive && !isCompleted && (step.number || idx + 1)}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: textColor, marginTop: 'var(--sp-1)', fontWeight: isActive ? 600 : 400 }}>
                {step.label}
              </div>
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: `${((idx + 0.5) * stepSize)}%`,
                    width: `${stepSize}%`,
                    height: '2px',
                    background: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
                    zIndex: -1,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
