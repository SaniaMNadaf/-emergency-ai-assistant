import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import {
  X,
  Play,
  Pause,
  MapPin,
  Clock,
  Radio,
  Check,
  AlertTriangle,
  Volume2,
  Camera,
  Activity,
  Shield,
  Send
} from 'lucide-react'

export default function AlertScreen({ broadcast, onResponded }) {
  const { user } = useAuth()
  const [incident, setIncident] = useState(null)
  const [incidentDetails, setIncidentDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(4)
  const [selectedEta, setSelectedEta] = useState(3)

  useEffect(() => {
    async function loadIncident() {
      if (!supabase || !broadcast) {
        setLoading(false)
        return
      }
      try {
        const { data: inc } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', broadcast.incident_id)
          .single()

        if (inc) {
          setIncident(inc)
          const { data: details } = await supabase.rpc('incident_details', { p_incident_id: inc.id })
          if (details && details.length > 0) {
            setIncidentDetails(details[0])
          }
        }
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    loadIncident()
  }, [broadcast])

  // Audio waveform animation simulation
  useEffect(() => {
    let interval = null
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress(p => (p >= 14 ? 0 : p + 1))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlayingAudio])

  const handleAccept = async (eta) => {
    setSubmitting(true)
    if (supabase && broadcast?.id) {
      await supabase
        .from('broadcasts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          eta_minutes: eta,
        })
        .eq('id', broadcast.id)

      if (incident?.id) {
        await supabase
          .from('incidents')
          .update({ status: 'acknowledged', outcome: 'genuine' })
          .eq('id', incident.id)
          .eq('status', 'open')
      }
    }
    setSubmitting(false)
    onResponded()
  }

  const handleDecline = async () => {
    setSubmitting(true)
    if (supabase && broadcast?.id) {
      await supabase
        .from('broadcasts')
        .update({ status: 'declined' })
        .eq('id', broadcast.id)
    }
    setSubmitting(false)
    onResponded()
  }

  const role = user?.role || 'doctor'
  const isDoctor = role === 'doctor'
  const actionButtonText = isDoctor ? "I'm En Route" : 'Dispatch Ambulance'

  return (
    <div style={{
      width: '100%',
      maxWidth: '960px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#0a0e14',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
      padding: '20px 16px 80px',
    }}>
      {/* Top Override Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1px solid #1e2837',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onResponded}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close alert"
          >
            <X size={16} />
          </button>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ● CRITICAL OVERRIDE
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
              Incoming Triage Override
            </div>
          </div>
        </div>

        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#ef4444',
          fontWeight: 800,
        }}>
          👤
        </div>
      </div>

      {/* Main Container Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Card 1: P1 Priority Banner */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#ef4444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                P1 PRIORITY DISPATCH
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#8492a6' }}>⏱ 18s AGO</span>
              <span style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                TIER 1 CRITICAL
              </span>
            </div>
          </div>

          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6', marginBottom: '4px' }}>
            INCIDENT ID: #PR-8842
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            CARDIAC ARREST
          </h1>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: '#18202d',
              border: '1px solid #2e3d52',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ♥ Bystander CPR Active (142 BPM)
            </span>
            <span style={{
              backgroundColor: '#18202d',
              border: '1px solid #2e3d52',
              color: '#06b6d4',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ⚡ AED Shock Advised
            </span>
          </div>
        </div>

        {/* Card 2: Proximity Vector */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '16px',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#8492a6', textTransform: 'uppercase' }}>
              <span>📍</span> PROXIMITY VECTOR
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>SECTOR 4A</span>
          </div>

          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
            0.2 mi (~3 min on foot)
          </div>

          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
            Market St & 4th St (Opposite Metro Plaza Entrance)
          </div>

          <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>◎</span> Within Priority 1 Tier Radius (0.5 mi)
          </div>
        </div>

        {/* Card 3: Scene Photo Feed */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '16px',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#8492a6', textTransform: 'uppercase' }}>
              <Camera size={14} color="#f59e0b" />
              SCENE PHOTO FEED
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              VERIFIED BYSTANDER
            </span>
          </div>

          <div style={{
            height: '180px',
            borderRadius: '12px',
            backgroundColor: '#0a0e14',
            border: '1px solid #182230',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.1) 0%, rgba(10, 14, 20, 0.95) 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '32px' }}>🚑</span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                VISUAL INTAKE #8842-A
              </div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>
                Adult Male • Defibrillator Pads Applied • Compressions Ongoing
              </div>
            </div>
            <span style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '10px', color: '#64748b' }}>
              18s AGO
            </span>
          </div>
        </div>

        {/* Card 4: 911 Audio Briefing with waveform */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '16px',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#8492a6', textTransform: 'uppercase' }}>
              <Volume2 size={14} color="#06b6d4" />
              911 Audio Briefing (0:14)
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>DISPATCH VOX</span>
          </div>

          <div style={{
            backgroundColor: '#0a0e14',
            border: '1px solid #182230',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
              }}
              aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
            >
              {isPlayingAudio ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#f8fafc', marginBottom: '6px' }}>
                Caller Audio: &quot;Male approx 50s, collapsed near crosswalk, not breathing normally...&quot;
              </div>

              {/* Waveform bars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '22px' }}>
                {[6, 12, 18, 14, 8, 22, 16, 10, 20, 24, 15, 8, 18, 12, 6, 14, 18, 10, 8, 16, 12, 6].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${h}px`,
                      borderRadius: '2px',
                      backgroundColor: i < (audioProgress * 1.5) ? '#ef4444' : '#2e3d52',
                      transition: 'background-color 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
              00:{audioProgress.toString().padStart(2, '0')} / 00:14
            </div>
          </div>
        </div>

        {/* Card 5: AI Triage Synthesis (With Mandatory Unverified Label) */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '16px',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
              <Activity size={14} color="#06b6d4" />
              TRIAGE SYNTHESIS
            </div>

            {/* MANDATORY UNVERIFIED LABEL */}
            <span style={{
              fontSize: '11px',
              fontStyle: 'italic',
              fontWeight: 700,
              color: '#ef4444',
              letterSpacing: '0.02em',
            }}>
              *Summary of caller’s report (unverified)*
            </span>
          </div>

          <p style={{
            fontSize: '13px',
            color: '#cbd5e1',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Adult male found non-responsive, agonal breathing. Bystander CPR initiated via 911 metronome guidance. Public AED deployed nearby. Immediate clinical defibrillation and advanced airway support required.
          </p>
        </div>

        {/* Role-Adaptive Action Button & Controls */}
        <div style={{
          backgroundColor: '#0d131d',
          border: '1px solid #1e2837',
          borderRadius: '16px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              {isDoctor ? 'Select Your Estimated Time of Arrival:' : 'Dispatch Deployment Options:'}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[3, 5, 8, 12].map(mins => (
                <button
                  key={mins}
                  onClick={() => setSelectedEta(mins)}
                  style={{
                    backgroundColor: selectedEta === mins ? '#ef4444' : '#18202d',
                    border: '1px solid #2e3d52',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            {/* Unified Role-Adaptive Action Button */}
            <button
              onClick={() => handleAccept(selectedEta)}
              disabled={submitting}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 20px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: submitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Check size={20} />
              {submitting ? 'Confirming Dispatch...' : `${actionButtonText} (${selectedEta}m)`}
            </button>

            <button
              onClick={handleDecline}
              disabled={submitting}
              style={{
                backgroundColor: '#18202d',
                border: '1px solid #2e3d52',
                color: '#8492a6',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              Decline / Reroute
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
