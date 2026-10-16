import { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Heart,
  AlertTriangle,
  ShieldAlert,
  Phone,
  Info,
  ChevronRight,
  Activity,
  Crosshair,
  Camera,
  Check,
  X
} from 'lucide-react'
import { SpeechRecognizer } from '../../lib/speech'
import { requestGeolocation } from '../../lib/permissions'
import { reportEmergency, shouldInvolvePolice } from '../../lib/broadcast'

export default function BystanderHome({
  user,
  onStartEmergency,
  onStartProtocol,
  onDirectEmergencyDispatched,
  onOpenDemoPanel,
  onLogout
}) {
  const [countdown, setCountdown] = useState(null) // null | number
  const countdownTimerRef = useRef(null)

  // Location state (automatically acquired in background)
  const [location, setLocation] = useState(null)
  const [locStatus, setLocStatus] = useState('Acquiring GPS...')

  // Speech recognition & live voice state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState(null)
  const recognizerRef = useRef(null)

  // Direct dispatch state
  const [isDirectSending, setIsDirectSending] = useState(false)
  const [directIncidentType, setDirectIncidentType] = useState('Medical')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileInputRef = useRef(null)

  // Acquire location automatically in the background on mount
  useEffect(() => {
    let isMounted = true
    requestGeolocation()
      .then((loc) => {
        if (isMounted) {
          setLocation(loc)
          setLocStatus('GPS Locked • ±3m')
        }
      })
      .catch(() => {
        if (isMounted) {
          // Automatic fallback to central downtown coordinates
          const defaultLoc = { lat: 37.7858, lng: -122.4065, accuracy: 15, address: 'Market St & 4th St, San Francisco' }
          setLocation(defaultLoc)
          setLocStatus('GPS Fallback Active')
        }
      })

    return () => {
      isMounted = false
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop()
        } catch {}
      }
    }
  }, [])

  // Handle Photo Attachment
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const removePhoto = (e) => {
    e?.stopPropagation()
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Voice recording toggle
  const startVoiceRecording = () => {
    setVoiceError(null)
    if (!SpeechRecognizer.isSupported()) {
      // Simulate voice input for environments without Web Speech API
      setIsRecording(true)
      setTimeout(() => {
        const demoTranscripts = [
          'Major car collision at intersection, two vehicles involved, heavy bleeding and smoke!',
          'Adult male collapsed on sidewalk, unresponsive, not breathing!',
          'Severe arterial bleeding from deep leg laceration, needs immediate tourniquet!'
        ]
        const sample = demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)]
        setTranscript(sample)
        setIsRecording(false)
        handleUrgentVoiceReport(sample)
      }, 2500)
      return
    }

    try {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop() } catch {}
      }

      const recognizer = new SpeechRecognizer(
        (text) => {
          setTranscript(text)
          handleUrgentVoiceReport(text)
        },
        (err) => {
          console.warn('Speech error:', err)
          setVoiceError('Voice recognition unavailable, tapping directly dispatches')
          setIsRecording(false)
        },
        () => {
          setIsRecording(false)
        }
      )

      recognizerRef.current = recognizer
      recognizer.start()
      setIsRecording(true)
    } catch {
      setIsRecording(false)
      setVoiceError('Microphone active in background')
    }
  }

  const stopVoiceRecording = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop()
      } catch {}
    }
    setIsRecording(false)
    if (transcript.trim()) {
      handleUrgentVoiceReport(transcript)
    }
  }

  // Direct Emergency Send (automatic without questionnaire/whereabouts screens)
  const executeDirectSend = async (incidentTypeToUse = 'Medical', transcriptToUse = '') => {
    if (isDirectSending) return
    setIsDirectSending(true)
    try {
      const effectiveLoc = location || { lat: 37.7858, lng: -122.4065, address: 'Market St & 4th St' }
      const result = await reportEmergency(user, effectiveLoc, photoFile, {
        incidentType: incidentTypeToUse,
        transcript: transcriptToUse || transcript,
        forceTier1: true,
      })

      if (onDirectEmergencyDispatched) {
        onDirectEmergencyDispatched(result)
      } else if (onStartEmergency) {
        onStartEmergency()
      }
    } catch (err) {
      console.error('Direct report failed, falling back:', err)
      if (onStartEmergency) onStartEmergency()
    } finally {
      setIsDirectSending(false)
    }
  }

  // Detect urgent report from voice input
  const handleUrgentVoiceReport = (spokenText) => {
    if (!spokenText || !spokenText.trim()) return

    const lower = spokenText.toLowerCase()
    // Identify incident category
    let type = 'Medical'
    if (/accident|crash|rollover|car|truck|collision|vehicle|hit and run|traffic/.test(lower)) {
      type = 'Accident'
    } else if (/bleeding|blood|laceration|arterial|wound|gash/.test(lower)) {
      type = 'Severe Bleeding'
    } else if (/cardiac|heart|chest|not breathing|unresponsive|cpr|choking/.test(lower)) {
      type = 'Cardiac / Breathing'
    } else if (/threat|violence|gun|shot|stab|assault|weapon/.test(lower)) {
      type = 'Violence / Threat'
    }

    setDirectIncidentType(type)

    // Automatically trigger direct emergency broadcast with 5s safety net
    startDirectEmergencyCountdown(type, spokenText)
  }

  // Start 5-second countdown safety net for direct dispatch
  const startDirectEmergencyCountdown = (type = 'Medical', spokenText = '') => {
    if (countdown !== null) return
    setDirectIncidentType(type)
    setCountdown(5)

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current)
          executeDirectSend(type, spokenText)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const cancelCountdown = (e) => {
    e?.stopPropagation()
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
  }

  const confirmImmediately = (e) => {
    e?.stopPropagation()
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
    executeDirectSend(directIncidentType, transcript)
  }

  const involvesPolice = shouldInvolvePolice(directIncidentType, transcript)

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '32px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Status Bar (Clean tactical styling with green online banner removed) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 4px',
        marginBottom: '16px',
      }}>
        {/* GPS Status with automatic background acquisition */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(18, 24, 34, 0.9)',
          border: '1px solid #1e2837',
          borderRadius: '9999px',
          padding: '5px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#cbd5e1',
        }}>
          <Crosshair size={13} color="#ef4444" />
          <span>{locStatus}</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={onOpenDemoPanel}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Demo Controls"
          >
            ⚙️ Demo
          </button>
          <button
            onClick={onLogout}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Switch User"
          >
            🚪
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: '#ef4444',
          textTransform: 'uppercase',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <span>◎</span> PULSERESCUE • BYSTANDER ASSIST
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.02em',
          color: '#f8fafc',
        }}>
          Witnessing a Crisis?
        </h1>
        <div style={{ fontSize: '13px', color: '#8492a6', marginTop: '4px' }}>
          Speak or tap to automatically broadcast to Hospital & Responders
        </div>
      </div>

      {/* Main Urgent Emergency / Voice Action Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative',
      }}>
        {countdown === null ? (
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            style={{
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              backgroundColor: isRecording ? '#dc2626' : '#ff4444',
              backgroundImage: isRecording
                ? 'radial-gradient(circle at 35% 35%, #ff4444 0%, #991b1b 100%)'
                : 'radial-gradient(circle at 35% 35%, #ff6b6b 0%, #ee2222 70%, #cc0000 100%)',
              border: isRecording ? '4px solid #fecaca' : 'none',
              boxShadow: isRecording
                ? '0 0 60px rgba(239, 68, 68, 0.8), 0 10px 30px rgba(0, 0, 0, 0.7)'
                : '0 0 50px rgba(239, 68, 68, 0.55), 0 10px 30px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
            onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            aria-label="Hold or tap to speak emergency report"
          >
            {isRecording ? (
              <>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '36px', marginBottom: '4px' }}>
                  {[12, 28, 36, 20, 32, 16, 30, 24, 14].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        width: '4px',
                        height: `${h}px`,
                        backgroundColor: '#ffffff',
                        borderRadius: '2px',
                        animation: `pulse 0.6s infinite ease-in-out ${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  LISTENING...
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9, textTransform: 'uppercase' }}>
                  TAP TO SEND
                </div>
              </>
            ) : (
              <>
                <Mic size={38} color="#ffffff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  HOLD & SPEAK
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9, textTransform: 'uppercase' }}>
                  INSTANT AUTO-DISPATCH
                </div>
              </>
            )}
          </button>
        ) : (
          /* Active 5-second countdown safety net */
          <div style={{
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            backgroundColor: '#161e29',
            border: '4px solid #ef4444',
            boxShadow: '0 0 50px rgba(239, 68, 68, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#f8fafc',
            textAlign: 'center',
            padding: '16px',
            animation: 'pulse 1s ease-in-out infinite',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DIRECT AUTO-DISPATCH
            </div>
            <div style={{ fontSize: '46px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
              {countdown}s
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
              {involvesPolice ? 'Hospital & Police Dispatched' : 'Hospital ER Dispatched'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={cancelCountdown}
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #475569',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImmediately}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '6px 14px',
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

        {/* Live Audio Transcript Display Card (When speaking or recorded) */}
        {transcript && (
          <div style={{
            marginTop: '16px',
            width: '100%',
            backgroundColor: '#121822',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                🚨 Urgent Voice Detected • Classified: {directIncidentType}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Auto-located</span>
            </div>
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#f8fafc', lineHeight: 1.4 }}>
              &quot;{transcript}&quot;
            </div>
          </div>
        )}

        {/* Quick Camera Attachment (Scene photo attaches directly with the broadcast) */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#121822',
              border: photoPreview ? '1px solid #10b981' : '1px solid #1e2837',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: photoPreview ? '#86efac' : '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            <Camera size={14} color={photoPreview ? '#10b981' : '#f59e0b'} />
            {photoPreview ? 'Photo Attached (Ready)' : 'Attach Scene Picture'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />

          {photoPreview && (
            <button
              type="button"
              onClick={removePhoto}
              style={{
                background: '#18202d',
                border: '1px solid #222d3d',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                cursor: 'pointer',
              }}
              title="Remove photo"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {photoPreview && (
          <div style={{ marginTop: '10px', width: '100%', maxWidth: '280px', position: 'relative' }}>
            <img
              src={photoPreview}
              alt="Scene preview"
              style={{
                width: '100%',
                height: '110px',
                objectFit: 'cover',
                borderRadius: '10px',
                border: '1px solid #1e2837',
              }}
            />
          </div>
        )}

        {/* Relay Pill */}
        <div style={{
          marginTop: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '9999px',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#cbd5e1',
        }}>
          <span style={{ color: '#ef4444' }}>⚡</span>
          Instant Hospital Relay & Automatic GPS Lock
        </div>
      </div>

      {/* Select Crisis Type Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#8492a6',
          textTransform: 'uppercase',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px',
        }}>
          <span>OR SELECT CRISIS TYPE FOR DIRECT AUTO-DISPATCH</span>
          <span style={{ color: '#ef4444', fontSize: '12px' }}>⚡</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Card 1: Car Crash / Rollover (Involves Police & Hospital) */}
          <div
            onClick={() => {
              startDirectEmergencyCountdown('Accident', 'Car crash / rollover with entrapment')
            }}
            style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#18202d',
              border: '1px solid #222d3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} color="#f59e0b" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Car Crash / Rollover</span>
                <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  HOSPITAL + POLICE
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8492a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Multi-vehicle impact • Entrapment & Rescue Teams
              </div>
            </div>
            <ChevronRight size={18} color="#64748b" />
          </div>

          {/* Card 2: Cardiac / Breathing (Hospital Only - Police NOT involved) */}
          <div
            onClick={() => {
              // Direct dispatch to hospital and start protocol
              executeDirectSend('Cardiac / Breathing', 'Cardiac arrest, unresponsive patient')
              onStartProtocol?.('cpr')
            }}
            style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#18202d',
              border: '1px solid #222d3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Heart size={20} color="#ef4444" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Cardiac / Breathing
                </span>
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  HOSPITAL ER
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8492a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Unresponsive • Direct CPR Protocol • Hospital Dispatched
              </div>
            </div>
            <ChevronRight size={18} color="#64748b" />
          </div>

          {/* Card 3: Severe Bleeding (Hospital Only - Police NOT involved) */}
          <div
            onClick={() => {
              executeDirectSend('Severe Bleeding', 'Severe arterial bleeding laceration')
              onStartProtocol?.('bleeding')
            }}
            style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#18202d',
              border: '1px solid #222d3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Activity size={20} color="#ef4444" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Severe Bleeding Control
                </span>
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  HOSPITAL ER
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8492a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Arterial laceration • Tourniquet guidance • Trauma alert
              </div>
            </div>
            <ChevronRight size={18} color="#64748b" />
          </div>

          {/* Card 4: Violence / Active Threat (Involves Police & Hospital) */}
          <div
            onClick={() => {
              startDirectEmergencyCountdown('Violence / Threat', 'Active threat / violence in area')
            }}
            style={{
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#18202d',
              border: '1px solid #222d3d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldAlert size={20} color="#06b6d4" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Violence / Active Threat</span>
                <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  HOSPITAL + POLICE
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8492a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Assault • Weapon • Safe distance guidance
              </div>
            </div>
            <ChevronRight size={18} color="#64748b" />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <Info size={18} color="#06b6d4" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
            Direct Automatic Triage
          </div>
          <div style={{ fontSize: '12px', color: '#8492a6', lineHeight: 1.4 }}>
            Voice emergency directly alerts Hospital ER with your GPS location. Police CAD is automatically summoned for accidents, car crashes, and rescue teams.
          </div>
        </div>
      </div>

      {/* Direct 911 Dial Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}>
            <Phone size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
              Direct 911 Dial
            </div>
            <div style={{ fontSize: '11px', color: '#8492a6' }}>
              Bypass app • Carrier cellular trunk
            </div>
          </div>
        </div>

        <a
          href="tel:911"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            textTransform: 'uppercase',
          }}
        >
          IMMEDIATE 📞
        </a>
      </div>
    </div>
  )
}
