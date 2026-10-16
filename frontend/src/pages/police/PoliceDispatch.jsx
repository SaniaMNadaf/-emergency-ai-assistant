import { useState, useEffect } from 'react'
import {
  Shield,
  Radio,
  MapPin,
  Play,
  Pause,
  AlertTriangle,
  Volume2,
  Users,
  Compass,
  Clock,
  Layers,
  Lock,
  PhoneCall,
  Activity,
  Send,
  CheckCircle,
  FileText
} from 'lucide-react'

export default function PoliceDispatch({ user, onOpenDemoPanel, onLogout }) {
  const [activeNav, setActiveNav] = useState('console')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(8)
  const [selectedUnit, setSelectedUnit] = useState('4-ADAM')
  const [dispatchedUnits, setDispatchedUnits] = useState(['4-ADAM'])
  const [elapsedSeconds, setElapsedSeconds] = useState(680)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1)
      if (isPlayingAudio) {
        setAudioProgress(p => (p >= 24 ? 0 : p + 1))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlayingAudio])

  const formatElapsed = (sec) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins}:${s.toString().padStart(2, '0')}`
  }

  const handleDispatch = (unitId) => {
    if (!dispatchedUnits.includes(unitId)) {
      setDispatchedUnits(prev => [...prev, unitId])
    }
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#0a0e14',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
      display: 'flex',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '240px',
        backgroundColor: '#0d131d',
        borderRight: '1px solid #1e2837',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          {/* Logo Brand */}
          <div style={{
            padding: '18px 16px',
            borderBottom: '1px solid #1e2837',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Shield size={18} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
                METRO CAD
              </div>
              <div style={{ fontSize: '10px', color: '#8492a6', letterSpacing: '0.06em' }}>
                DISPATCH TERMINAL 04
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'console', label: 'LIVE CONSOLE', icon: Radio },
              { id: 'incidents', label: 'INCIDENTS', icon: AlertTriangle },
              { id: 'matrix', label: 'UNIT MATRIX', icon: Users },
              { id: 'tactical', label: 'TACTICAL MAP', icon: Compass },
              { id: 'calls', label: 'CALL LOG', icon: PhoneCall },
              { id: 'comms', label: 'COMMS LOG', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeNav === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveNav(tab.id)}
                  style={{
                    backgroundColor: isActive ? '#ef4444' : 'transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e2837', fontSize: '11px', color: '#64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>SYSTEM TELEMETRY</span>
            <span style={{ color: '#10b981' }}>●</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: '#8492a6', marginBottom: '12px' }}>
            UPLINK: 44ms • 99.92%
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onOpenDemoPanel}
              style={{
                flex: 1,
                background: '#121822',
                border: '1px solid #1e2837',
                borderRadius: '6px',
                padding: '6px',
                color: '#cbd5e1',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              ⚙️ Demo
            </button>
            <button
              onClick={onLogout}
              style={{
                background: '#121822',
                border: '1px solid #1e2837',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#ef4444',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Logout"
            >
              <Lock size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Command Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Command Status Strip */}
        <header style={{
          backgroundColor: '#0d131d',
          borderBottom: '1px solid #1e2837',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
            <span style={{ fontWeight: 800, color: '#f8fafc' }}>◎ SECTOR 4 COMMAND</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#8492a6' }}>SHIFT: ALPHA-01 (0600-1800)</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#06b6d4' }}>FREQ: TAC-4 460.125 MHz</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              BROADCAST LIVE
            </span>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
              14:32:08 UTC CAD SYNCED
            </span>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#06b6d4',
              fontWeight: 800,
            }}>
              JM
            </div>
          </div>
        </header>

        {/* Priority Incident Banner Strip */}
        <div style={{
          backgroundColor: '#121822',
          borderBottom: '1px solid #1e2837',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              PRIORITY 1 CRITICAL
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
              CAD #PD-4891 SEC-04A ALARM CODE 211
            </span>
            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
              COMMERCIAL ARMED ROBBERY (IN-PROGRESS)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
            <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
              ⏱ TIME ELAPSED {formatElapsed(elapsedSeconds)}
            </span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              ● GEO-TRACKING ENGAGED
            </span>
          </div>
        </div>

        {/* Desktop 2-Column Split: Center Tactical & Right Intelligence */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: 0 }}>
          {/* Center Column: Tactical Radar & Patrol Units */}
          <div style={{
            padding: '20px',
            borderRight: '1px solid #1e2837',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
          }}>
            {/* Tactical Radar Map Container */}
            <div style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '16px',
              padding: '18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
                  <span>◎</span> TACTICAL RADAR INTERCEPT
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#8492a6' }}>
                  <span>TRAFFIC: NORMAL</span>
                  <span>•</span>
                  <span>3 CARS IN PERIMETER</span>
                </div>
              </div>

              {/* Radar Graphic Canvas */}
              <div style={{
                height: '240px',
                borderRadius: '12px',
                backgroundColor: '#0a0e14',
                border: '1px solid #182230',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* Concentric rings */}
                <div style={{ position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', border: '1px dashed rgba(239, 68, 68, 0.15)' }} />
                <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.25)' }} />
                <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.35)' }} />

                {/* Target incident marker */}
                <div style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <div style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 900,
                    boxShadow: '0 0 16px #ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span>⚠</span> 742 Market St (Corner 4th)
                  </div>
                  <span style={{ fontSize: '10px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: 700 }}>
                    Storefront Commercial
                  </span>
                </div>

                {/* Patrol unit markers on radar */}
                <div style={{ position: 'absolute', top: '35px', right: '80px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#06b6d4', backgroundColor: '#121822', padding: '2px 6px', borderRadius: '4px' }}>
                    2-BOY 0.4 mi (3m)
                  </span>
                </div>

                <div style={{ position: 'absolute', bottom: '40px', right: '110px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', backgroundColor: '#121822', padding: '2px 6px', borderRadius: '4px' }}>
                    4-SIERRA [SUPV] 0.8 mi
                  </span>
                </div>

                <div style={{ position: 'absolute', bottom: '10px', left: '16px', fontSize: '11px', color: '#64748b' }}>
                  TACTICAL ZONE: Sector 4A • Coordinates: 37.7858° N, 122.4065° W
                </div>
              </div>
            </div>

            {/* Patrol Units Status Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  <Users size={16} color="#06b6d4" />
                  Patrol Units Status
                </div>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                  AUTO-DISPATCH QUEUE READY
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* Unit 4-ADAM */}
                <div style={{
                  backgroundColor: '#121822',
                  border: '2px solid #ef4444',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 0 16px rgba(239, 68, 68, 0.2)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>UNIT 4-ADAM</div>
                    <span style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                      RECOMMENDED
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '10px' }}>
                    Davis (Badge 404) & Kovacs (Badge 512)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>0.2 MI • AVAIL</span>
                    <span style={{ color: '#f59e0b', fontWeight: 800 }}>ETA 90s</span>
                  </div>
                </div>

                {/* Unit 2-BOY */}
                <div style={{
                  backgroundColor: '#121822',
                  border: '1px solid #1e2837',
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>UNIT 2-BOY</div>
                    <span style={{ backgroundColor: '#18202d', color: '#8492a6', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                      STANDBY
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '10px' }}>
                    Chen (Badge 881) • Solo Patrol
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>0.6 MI • AVAIL</span>
                    <span style={{ color: '#8492a6', fontWeight: 800 }}>ETA 3 MIN</span>
                  </div>
                </div>

                {/* Unit 4-SIERRA */}
                <div style={{
                  backgroundColor: '#121822',
                  border: '1px solid #1e2837',
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>4-SIERRA (SGT)</div>
                    <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                      SUPERVISOR
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '10px' }}>
                    Sgt. Vance (Badge 109)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>0.8 MI • FIELD</span>
                    <span style={{ color: '#8492a6', fontWeight: 800 }}>ETA 4 MIN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Actions Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginTop: 'auto' }}>
              <button
                style={{
                  backgroundColor: '#18202d',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} /> REQUEST BACKUP
              </button>

              <button
                onClick={() => handleDispatch('4-ADAM')}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  fontSize: '16px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Send size={18} />
                DISPATCH 4-ADAM (0.2 MI • ETA 90 SECONDS)
              </button>
            </div>
          </div>

          {/* Right Column: Incident Intelligence, Audio Feed, & Activity Log */}
          <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            overflowY: 'auto',
          }}>
            {/* Card 1: Incident Intelligence (with MANDATORY UNVERIFIED LABEL) */}
            <div style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '16px',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  <Shield size={16} color="#ef4444" />
                  Incident Intelligence
                </div>

                {/* MANDATORY UNVERIFIED LABEL */}
                <span style={{
                  fontSize: '11px',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  color: '#ef4444',
                }}>
                  *Summary of caller’s report (unverified)*
                </span>
              </div>

              <p style={{
                fontSize: '13px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                margin: '0 0 16px',
              }}>
                Caller reports two individuals wearing dark hoodies attempting forced entry into commercial premises with what appears to be a firearm. Cash register targeted. Staff evacuated through rear exit. Bystander is observing from safe distance across Market Street.
              </p>

              {/* 4-Metric Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '2px' }}>
                    SUSPECTS COUNT
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                    2 Individuals (Male, Hooded)
                  </div>
                </div>

                <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '2px' }}>
                    WEAPONS REPORTED
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>
                    Handgun (Unconfirmed)
                  </div>
                </div>

                <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '2px' }}>
                    INJURIES REPORTED
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>
                    0 Injuries Documented
                  </div>
                </div>

                <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '2px' }}>
                    CIVILIANS IN AREA
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1' }}>
                    ~6 Evacuated Safely
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Bystander 911 Audio Feed */}
            <div style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '16px',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  <Volume2 size={16} color="#06b6d4" />
                  Bystander 911 Audio Feed
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
                  00:24 DURATION
                </span>
              </div>

              {/* Audio Player */}
              <div style={{
                backgroundColor: '#0a0e14',
                border: '1px solid #182230',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 14px rgba(239, 68, 68, 0.4)',
                  }}
                  aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
                >
                  {isPlayingAudio ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                </button>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', height: '24px' }}>
                  {[10, 18, 22, 14, 8, 26, 18, 12, 24, 28, 16, 10, 22, 14, 8, 18, 24, 12, 8, 20, 16, 8, 14, 10].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '3px',
                        height: `${h}px`,
                        borderRadius: '2px',
                        backgroundColor: i < (audioProgress * 1.0) ? '#ef4444' : '#222d3d',
                        transition: 'background-color 0.15s ease',
                      }}
                    />
                  ))}
                </div>

                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
                  00:{audioProgress.toString().padStart(2, '0')} / 00:24
                </div>
              </div>

              {/* Live Speech Transcription */}
              <div style={{
                backgroundColor: '#0a0e14',
                border: '1px solid #182230',
                borderRadius: '10px',
                padding: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: '#8492a6', marginBottom: '6px' }}>
                  <span>LIVE SPEECH TRANSCRIPTION</span>
                  <span style={{ color: '#10b981' }}>CONFIDENCE 98%</span>
                </div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#cbd5e1', lineHeight: 1.4 }}>
                  &quot;Caller: &apos;They just smashed the glass... I see two guys inside, one has something in his right hand... dark clothing, heading towards cash station.&apos;&quot;
                </div>
              </div>
            </div>

            {/* Card 3: CAD Event Activity Log */}
            <div style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '16px',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                  <FileText size={16} color="#06b6d4" />
                  CAD EVENT ACTIVITY LOG
                </div>
                <span style={{ fontSize: '11px', color: '#8492a6' }}>4 ENTRIES</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span><strong style={{ fontFamily: 'var(--font-mono)', color: '#ef4444' }}>14:31:26</strong> Commercial Silent Panic Trip - Store 104</span>
                  <span style={{ color: '#8492a6' }}>AUTO</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span><strong style={{ fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>14:31:40</strong> 911 Voice Call Linked to Incident #PD-4091</span>
                  <span style={{ color: '#8492a6' }}>OP-04</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span><strong style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>14:32:02</strong> 4-ADAM Designated Primary Responder (Closest Unit)</span>
                  <span style={{ color: '#8492a6' }}>CAD AI</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span><strong style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>14:32:15</strong> Mutual Aid Perimeter Staged (Sector 4 Outer)</span>
                  <span style={{ color: '#8492a6' }}>SUPV</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
