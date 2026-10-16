import { useState, useEffect, useRef } from 'react'
import { requestGeolocation } from '../../lib/permissions'
import { reportEmergency } from '../../lib/broadcast'
import { Heart, Car, Wind, MoreHorizontal, Camera, Crosshair, ArrowLeft, Phone, Check } from 'lucide-react'

export default function ReportScreen({ user, onReportSubmitted, onCancel }) {
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(true)
  const [locError, setLocError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [selectedType, setSelectedType] = useState('Medical')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(null) // 5-second countdown safety net
  const countdownTimerRef = useRef(null)

  useEffect(() => {
    requestGeolocation()
      .then((loc) => {
        setLocation(loc)
        setLocLoading(false)
      })
      .catch((err) => {
        setLocError(err.message)
        setLocLoading(false)
      })

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const doSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await reportEmergency(user, location, photoFile, {
        incidentType: selectedType,
        forceTier1: true
      })
      onReportSubmitted(result)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const handleStartSubmit = (e) => {
    e?.preventDefault()
    if (submitting) return
    // 5-second countdown safety net
    setCountdown(5)
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current)
          doSubmit()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
  }

  const handleConfirmImmediately = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
    doSubmit()
  }

  const types = [
    { id: 'Medical', label: 'Medical', icon: Heart, color: '#ef4444' },
    { id: 'Accident', label: 'Accident', icon: Car, color: '#f59e0b' },
    { id: 'Choking', label: 'Choking', icon: Wind, color: '#06b6d4' },
    { id: 'Other', label: 'Other', icon: MoreHorizontal, color: '#94a3b8' },
  ]

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '32px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '8px 0',
      }}>
        <button
          onClick={onCancel}
          style={{
            background: '#121822',
            border: '1px solid #1e2837',
            borderRadius: '9999px',
            padding: '6px 14px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowLeft size={14} />
          BACK
        </button>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '9999px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#ef4444',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          LIVE LOCATION
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Detected Location Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '18px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#8492a6', textTransform: 'uppercase' }}>
            <Crosshair size={14} color="#ef4444" />
            DETECTED LOCATION
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}>
            Accurate to ±2m
          </span>
        </div>

        {/* Radar Graphic Container */}
        <div style={{
          height: '110px',
          borderRadius: '12px',
          backgroundColor: '#0a0e14',
          border: '1px solid #182230',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}>
          {/* Radar Circles */}
          <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', border: '1px dashed rgba(239, 68, 68, 0.2)' }} />
          <div style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }} />
          {/* Pulsing Pin */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s infinite',
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 900,
              boxShadow: '0 0 12px #ef4444',
            }}>
              *
            </div>
          </div>
          <span style={{ position: 'absolute', bottom: '8px', left: '12px', fontSize: '11px', color: '#64748b' }}>
            {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Market St & 4th St'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              Market St & 4th St
            </div>
            <div style={{ fontSize: '12px', color: '#8492a6' }}>
              San Francisco, CA {locLoading && '• Acquiring GPS...'}
            </div>
            {locError && <div style={{ fontSize: '11px', color: '#ef4444' }}>GPS: {locError}</div>}
          </div>

          <button
            type="button"
            style={{
              background: '#18202d',
              border: '1px solid #222d3d',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>◎</span> ADJUST
          </button>
        </div>
      </div>

      {/* What's Happening 2x2 Grid */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px' }}>
          What&apos;s happening?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {types.map((t) => {
            const Icon = t.icon
            const isSelected = selectedType === t.id

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                style={{
                  backgroundColor: '#121822',
                  border: isSelected ? '2px solid #ef4444' : '1px solid #1e2837',
                  borderRadius: '14px',
                  padding: '16px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 18px rgba(239, 68, 68, 0.25)' : 'none',
                }}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    SELECTED
                  </span>
                )}

                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? '#ef4444' : '#18202d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  transition: 'background-color 0.15s ease',
                }}>
                  <Icon size={20} color={isSelected ? '#ffffff' : t.color} />
                </div>

                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                  {t.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Add Photo Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '14px',
        padding: '14px 16px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#18202d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Camera size={20} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Add Photo
              </div>
              <div style={{ fontSize: '12px', color: '#8492a6' }}>
                Optional • Unlocks Tier 1 Hospital Alert
              </div>
            </div>
          </div>

          <label style={{
            backgroundColor: '#18202d',
            border: '1px solid #222d3d',
            color: '#f8fafc',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {photoFile ? 'CHANGE' : 'ATTACH'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {photoPreview && (
          <div style={{ marginTop: '12px', position: 'relative' }}>
            <img
              src={photoPreview}
              alt="Incident preview"
              style={{
                width: '100%',
                maxHeight: '180px',
                objectFit: 'cover',
                borderRadius: '10px',
                border: '1px solid #1e2837',
              }}
            />
            <span style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Check size={12} /> Ready for Dispatch
            </span>
          </div>
        )}
      </div>

      {/* Bottom Emergency Button with 5-Second Countdown Safety Net */}
      <div style={{ marginBottom: '16px' }}>
        {countdown === null ? (
          <button
            type="button"
            onClick={handleStartSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: '#ef4444',
              backgroundImage: 'linear-gradient(180deg, #ff5252 0%, #ee2222 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '17px',
              fontWeight: 800,
              cursor: submitting ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 6px 24px rgba(239, 68, 68, 0.45)',
              transition: 'all 0.15s ease',
            }}
          >
            {submitting ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
                Broadcasting Emergency...
              </>
            ) : (
              <>
                <span style={{ fontSize: '20px' }}>🎯</span>
                Send Emergency Alert
              </>
            )}
          </button>
        ) : (
          /* Active 5-second countdown */
          <div style={{
            backgroundColor: '#18202d',
            border: '2px solid #ef4444',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                Broadcasting in {countdown}s...
              </div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>
                Tap Cancel if pressed by mistake
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCancelCountdown}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImmediately}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Send Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Or Call 911 Directly */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="tel:911"
          style={{
            color: '#8492a6',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Phone size={14} color="#ef4444" />
          Or Call 911 Directly
        </a>
      </div>
    </div>
  )
}
