import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { escalateBroadcasts, ESCALATION_INTERVAL_MS } from '../../lib/broadcast'
import { Heart, Phone, Video, ChevronDown, ChevronUp, MessageSquare, ArrowRight, Shield, Flame, Activity } from 'lucide-react'

export default function StatusScreen({ incident, broadcasts, initialTier = 1, onStartProtocol, onReset }) {
  const [currentTier, setCurrentTier] = useState(initialTier)
  const [acknowledgedResponder, setAcknowledgedResponder] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(ESCALATION_INTERVAL_MS / 1000)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [streamActive, setStreamActive] = useState(false)

  // Realtime subscription for broadcast responses
  useEffect(() => {
    if (!supabase || !incident) return

    const channel = supabase
      .channel(`incident-broadcasts-${incident.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'broadcasts', filter: `incident_id=eq.${incident.id}` },
        (payload) => {
          if (payload.new && payload.new.status === 'acknowledged') {
            setAcknowledgedResponder(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [incident])

  // Escalation timer countdown
  useEffect(() => {
    if (acknowledgedResponder || currentTier >= 3) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (incident?.id) {
            escalateBroadcasts(incident.id, currentTier).then((res) => {
              if (res.success && res.nextTier) {
                setCurrentTier(res.nextTier)
              }
            })
          }
          return ESCALATION_INTERVAL_MS / 1000
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [incident, currentTier, acknowledgedResponder])

  const incidentCode = incident?.id ? `#PR-${incident.id.toString().slice(-4).toUpperCase()}` : '#PR-8842'
  const etaMins = acknowledgedResponder?.eta_minutes || 3
  const responderName = acknowledgedResponder ? 'Dr. Sarah Chen' : 'Dr. Sarah Chen (Primary Lead)'

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '32px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '9999px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 800,
          color: '#ef4444',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
          LIVE BROADCAST
        </div>

        <div style={{
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: '#06b6d4',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span>⟪•⟫</span> INCIDENT {incidentCode}
        </div>
      </div>

      {/* Main Status Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Activity size={20} color="#ef4444" />
        </div>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Help is on the way
        </h1>
      </div>

      {/* Primary Responder ETA Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '16px',
        padding: '16px 18px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
              {responderName}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
              arriving in ~{etaMins} mins
            </div>
            <div style={{ fontSize: '12px', color: '#8492a6' }}>
              Closest Responder • 0.2 mi away
            </div>
          </div>

          <div style={{
            backgroundColor: '#18202d',
            border: '1px solid #222d3d',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span>📍</span> Market St & 4th St
          </div>
        </div>
      </div>

      {/* Prominent Action Card: START CPR GUIDANCE */}
      <div
        onClick={onStartProtocol}
        style={{
          backgroundColor: '#ef4444',
          backgroundImage: 'linear-gradient(135deg, #ff4d4d 0%, #ee2222 100%)',
          borderRadius: '16px',
          padding: '18px 20px',
          marginBottom: '24px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Heart size={26} color="#ffffff" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
                START CPR GUIDANCE
              </span>
              <span style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                ACTION NEEDED
              </span>
            </div>
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}>
            <ArrowRight size={18} />
          </div>
        </div>

        <p style={{
          margin: 0,
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: 1.4,
        }}>
          Hands-only metronome (110 BPM) & step-by-step audio coaching
        </p>
      </div>

      {/* Responders En Route Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          padding: '0 4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
            <span>🏃</span> Responders En Route
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '0.06em',
          }}>
            3 DISPATCHED
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Responder 1 */}
          <div style={{
            backgroundColor: '#121822',
            border: '1px solid #1e2837',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#18202d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #2e3d52',
              }}>
                <span style={{ fontSize: '20px' }}>👩‍⚕️</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                  Dr. Sarah Chen, MD
                </div>
                <div style={{ fontSize: '11px', color: '#8492a6' }}>
                  Cardiologist • Medic 14 Lead
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 8px',
                borderRadius: '6px',
              }}>
                ETA 3 MINS
              </span>
              <a
                href="tel:911"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#18202d',
                  border: '1px solid #222d3d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f8fafc',
                  textDecoration: 'none',
                }}
                aria-label="Call responder"
              >
                <Phone size={14} />
              </a>
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#18202d',
                  border: '1px solid #222d3d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f8fafc',
                  cursor: 'pointer',
                }}
                aria-label="Message responder"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          </div>

          {/* Responder 2 */}
          <div style={{
            backgroundColor: '#121822',
            border: '1px solid #1e2837',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#18202d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #2e3d52',
              }}>
                <Flame size={20} color="#f59e0b" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                  SF Fire Medic 14
                </div>
                <div style={{ fontSize: '11px', color: '#8492a6' }}>
                  ALS Advanced Rig • Sirens Active
                </div>
              </div>
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}>
              ETA 6 MINS
            </span>
          </div>

          {/* Responder 3 */}
          <div style={{
            backgroundColor: '#121822',
            border: '1px solid #1e2837',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#18202d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid #2e3d52',
              }}>
                <Shield size={20} color="#06b6d4" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                  Officer J. Miller (SFPD)
                </div>
                <div style={{ fontSize: '11px', color: '#8492a6' }}>
                  SFPD Sector 3 • Defibrillator Equipped
                </div>
              </div>
            </div>

            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}>
              ETA 4 MINS
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setStreamActive(!streamActive)}
          style={{
            backgroundColor: streamActive ? 'rgba(239, 68, 68, 0.2)' : '#121822',
            border: streamActive ? '1px solid #ef4444' : '1px solid #1e2837',
            borderRadius: '12px',
            padding: '12px',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Video size={16} color={streamActive ? '#ef4444' : '#8492a6'} />
          {streamActive ? 'Streaming...' : 'Stream Video'}
        </button>

        <a
          href="tel:911"
          style={{
            backgroundColor: '#121822',
            border: '1px solid #1e2837',
            borderRadius: '12px',
            padding: '12px',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Phone size={16} color="#ef4444" />
          Call 911 Direct
        </a>
      </div>

      {/* Collapsible Telemetry Section */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <button
          type="button"
          onClick={() => setShowTelemetry(!showTelemetry)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#f8fafc',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800 }}>Dispatch & Escalation Telemetry</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}>
              AUTO-CASCADE ACTIVE
            </span>
            {showTelemetry ? <ChevronUp size={16} color="#8492a6" /> : <ChevronDown size={16} color="#8492a6" />}
          </div>
        </button>

        {showTelemetry && (
          <div style={{ padding: '0 16px 14px', borderTop: '1px solid #18202d', paddingTop: '12px' }}>
            <div style={{ fontSize: '12px', color: '#8492a6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Current Tier: <strong style={{ color: '#f8fafc' }}>Tier {currentTier}</strong> (Local Doctors & EMS)</div>
              {!acknowledgedResponder && currentTier < 3 && (
                <div>Next cascade in: <strong style={{ color: '#f59e0b' }}>{secondsRemaining}s</strong></div>
              )}
              <div>Broadcasted to: <strong style={{ color: '#f8fafc' }}>{broadcasts?.length || 3} verified responders</strong></div>
              <div>GPS lock: <strong style={{ color: '#10b981' }}>Lat 37.7858, Lng -122.4065</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Broadcast / Reset Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: '#8492a6',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ⊗ CANCEL BROADCAST (FALSE ALARM)
        </button>
      </div>
    </div>
  )
}
