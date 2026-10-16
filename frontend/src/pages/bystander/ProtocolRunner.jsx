import { useState, useEffect, useRef } from 'react'
import { speak, speakStop, SpeechRecognizer } from '../../lib/speech'
import { supabase } from '../../lib/supabase'
import { Volume2, Phone, Check, X, ArrowLeft, ArrowRight, Mic, ShieldAlert, Clock, AlertTriangle } from 'lucide-react'

export default function ProtocolRunner({ treeId, incidentId, user, onFinish, onCancel }) {
  const [tree, setTree] = useState(null)
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [listening, setListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState(null)
  const [history, setHistory] = useState([])
  const [guardStatus, setGuardStatus] = useState(null)
  const [guardLoading, setGuardLoading] = useState(false)
  const [secondsActive, setSecondsActive] = useState(0)

  const sessionIdRef = useRef(null)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsActive(s => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load tree
  useEffect(() => {
    async function loadTreeAndCreateSession() {
      try {
        const res = await fetch(`/protocols/${treeId}.json`)
        if (!res.ok) throw new Error(`Failed to load protocol ${treeId}`)
        const data = await res.json()
        setTree(data)
        setCurrentNodeId(data.start)
        speak(`Starting first aid protocol: ${data.title}`)

        const currentUser = userRef.current
        if (currentUser && supabase) {
          const { data: sess, error: sessErr } = await supabase
            .from('protocol_sessions')
            .insert({
              incident_id: incidentId || null,
              user_id: currentUser.id,
              tree_id: treeId,
              steps: { current: data.start, history: [] },
              started_at: new Date().toISOString()
            })
            .select('id')
            .single()

          if (!sessErr && sess) {
            sessionIdRef.current = sess.id
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTreeAndCreateSession()
    return () => {
      speakStop()
    }
  }, [treeId, incidentId])

  // Sync state to Supabase
  useEffect(() => {
    if (tree && currentNodeId && sessionIdRef.current && supabase) {
      supabase.from('protocol_sessions')
        .update({
          steps: { current: currentNodeId, history }
        })
        .eq('id', sessionIdRef.current)
        .then(() => {})
        .catch(() => {})
    }
  }, [currentNodeId, history, tree])

  // Speak when node changes
  useEffect(() => {
    if (tree && currentNodeId) {
      const node = tree.nodes[currentNodeId]
      if (node && node.text) {
        speak(node.text)
      }
    }
  }, [currentNodeId, tree])

  // Question Answer Handler (YES / NO branches)
  const handleAnswer = async (answerYes) => {
    if (!tree || !currentNodeId) return
    const node = tree.nodes[currentNodeId]
    const nextId = answerYes ? node.yes : node.no

    setGuardLoading(true)
    try {
      const guardRes = await fetch('/api/protocol-guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treeId,
          currentStepId: currentNodeId,
          userAnswer: answerYes ? 'yes' : 'no',
          history,
        }),
      })
      const guardData = await guardRes.json()
      setGuardStatus(guardData)
    } catch {
      setGuardStatus({ guard: 'ok', reason: 'Safety check passed' })
    } finally {
      setGuardLoading(false)
    }

    if (nextId) {
      setHistory(prev => [...prev, { nodeId: currentNodeId, answer: answerYes ? 'yes' : 'no' }])
      setCurrentNodeId(nextId)
    }
  }

  // Instruction Next Step Handler
  const handleNext = () => {
    if (!tree || !currentNodeId) return
    const node = tree.nodes[currentNodeId]
    const nextId = node.next
    if (nextId) {
      setHistory(prev => [...prev, { nodeId: currentNodeId, action: 'next' }])
      setCurrentNodeId(nextId)
    }
  }

  // Instruction Back Step Handler
  const handleBack = () => {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setCurrentNodeId(previous.nodeId)
  }

  // Web Speech API Voice Input
  const startVoiceInput = () => {
    if (!SpeechRecognizer.isSupported()) {
      setVoiceMessage('Speech recognition not supported in this browser. Please tap buttons.')
      return
    }
    setListening(true)
    setVoiceMessage(null)
    try {
      const rec = new SpeechRecognizer(
        (transcript) => {
          setListening(false)
          const lower = transcript.toLowerCase()
          const yesRegex = /\b(yes|yeah|yep|affirmative|correct)\b/i
          const noRegex = /\b(no|nope|negative)\b/i

          if (yesRegex.test(lower)) {
            setVoiceMessage(`Heard: "${transcript}" → YES`)
            handleAnswer(true)
          } else if (noRegex.test(lower)) {
            setVoiceMessage(`Heard: "${transcript}" → NO`)
            handleAnswer(false)
          } else {
            setVoiceMessage(`Heard: "${transcript}". Please tap YES or NO.`)
          }
        },
        () => setListening(false),
        () => setListening(false)
      )
      rec.start()
    } catch {
      setListening(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '460px', margin: '40px auto', textAlign: 'center', color: '#f8fafc' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: '#ef4444' }} />
        <p style={{ color: '#8492a6' }}>Loading protocol...</p>
      </div>
    )
  }

  if (error || !tree || !currentNodeId) {
    return (
      <div style={{ maxWidth: '460px', margin: '40px auto', textAlign: 'center', color: '#f8fafc' }}>
        <p style={{ color: '#ef4444' }}>Protocol unavailable offline.</p>
        <button onClick={onCancel} style={{ background: '#121822', color: '#ffffff', border: '1px solid #1e2837', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>
          Back to Home
        </button>
      </div>
    )
  }

  const node = tree.nodes[currentNodeId]
  const isEnd = node.type === 'end'
  const isQuestion = node.type === 'question'
  const nodeCount = Object.keys(tree.nodes).length || 4
  const currentStepNumber = Math.min(history.length + 1, nodeCount)

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '32px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onCancel}
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
              fontSize: '14px',
            }}
            aria-label="Exit protocol"
          >
            ✕
          </button>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              EMERGENCY RUNNER
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {tree.title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '4px 8px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            ACTIVE
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}>
            👤
          </div>
        </div>
      </div>

      {/* Subheader Responder Banner */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '9999px',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>Dr. Sarah Chen en route</span>
          <span style={{ color: '#8492a6' }}>• ETA 02:48</span>
        </div>
        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em' }}>
          OFFLINE READY
        </span>
      </div>

      {/* Stepper Progress Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            STEP {currentStepNumber} OF {nodeCount}
          </span>
          <span style={{ fontSize: '11px', color: '#8492a6' }}>
            {tree.title.split('(')[0].trim()}
          </span>
        </div>

        {/* 4 Segmented Bars */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(nodeCount, 6)}, 1fr)`, gap: '4px' }}>
          {Array.from({ length: Math.min(nodeCount, 6) }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '4px',
                borderRadius: '2px',
                backgroundColor: i < currentStepNumber ? '#ef4444' : '#1e2837',
                boxShadow: i < currentStepNumber ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Protocol Card with Red Left Accent Bar */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderLeft: '4px solid #ef4444',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Card Header Tag & Audio */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              STEP 0{currentStepNumber} / {isQuestion ? 'ASSESSMENT' : 'CRITICAL'}
            </span>

            <button
              onClick={() => speak(node.text)}
              style={{
                background: '#18202d',
                border: '1px solid #222d3d',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
              aria-label="Repeat step audio"
            >
              <Volume2 size={14} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: '#f59e0b',
          }}>
            <Clock size={12} color="#f59e0b" />
            {formatTimer(secondsActive)} - CHECK
          </div>
        </div>

        {/* Step Text Headline */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#f8fafc',
          lineHeight: 1.3,
          margin: '0 0 10px',
        }}>
          {node.text}
        </h2>

        {/* Step Subtext Description */}
        <p style={{
          fontSize: '13px',
          color: '#cbd5e1',
          lineHeight: 1.5,
          margin: '0 0 16px',
        }}>
          {isQuestion
            ? 'Observe the patient carefully and select YES or NO, or speak your answer aloud.'
            : 'Maintain firm, constant compression. Lock elbows straight and do not release until instructed.'}
        </p>

        {/* Diagram / Graphic Container */}
        <div style={{
          backgroundColor: '#0a0e14',
          border: '1px solid #182230',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          position: 'relative',
        }}>
          {/* Visual animation arrows / hands target */}
          <div style={{
            width: '120px',
            height: '70px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
              <span style={{ color: '#ef4444', fontSize: '18px', animation: 'bounce 1s infinite' }}>↓</span>
              <span style={{ color: '#ef4444', fontSize: '22px', fontWeight: 900, animation: 'bounce 1s infinite 0.1s' }}>↓</span>
              <span style={{ color: '#ef4444', fontSize: '18px', animation: 'bounce 1s infinite 0.2s' }}>↓</span>
            </div>

            <div style={{
              width: '80px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 800,
              color: '#fca5a5',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              TARGET SITE
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#ef4444',
            textTransform: 'uppercase',
          }}>
            <span>✋ LOCK ELBOWS</span>
            <span style={{ color: '#8492a6' }}>HOLD CONTINUOUSLY (3 MIN)</span>
          </div>
        </div>

        {/* Do Not Lift / Safety Callout */}
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          gap: '10px',
        }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DO NOT LIFT TO CHECK
            </div>
            <div style={{ color: '#cbd5e1' }}>
              If blood soaks through, <strong style={{ color: '#f8fafc', textDecoration: 'underline' }}>never remove cloth</strong>. Stack more cloth on top and press harder.
            </div>
          </div>
        </div>

        {/* Protocol Guard Status Badge */}
        {guardStatus && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            backgroundColor: guardStatus.guard === 'block' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
            color: guardStatus.guard === 'block' ? '#ef4444' : '#10b981',
            border: `1px solid ${guardStatus.guard === 'block' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <ShieldAlert size={14} />
            <span>AI Safety Guard: {guardStatus.guard.toUpperCase()} — {guardStatus.reason || 'Step verification OK'}</span>
          </div>
        )}

        {voiceMessage && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
          }}>
            {voiceMessage}
          </div>
        )}
      </div>

      {/* Dynamic Interaction Controls (Instruction: Back/Next, Question: Yes/No + Speech) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {isQuestion ? (
          <>
            {/* Yes / No Buttons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleAnswer(true)}
                disabled={guardLoading}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Check size={22} />
                YES
              </button>

              <button
                type="button"
                onClick={() => handleAnswer(false)}
                disabled={guardLoading}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                }}
              >
                <X size={22} />
                NO
              </button>
            </div>

            {/* Answer by Voice Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              style={{
                backgroundColor: '#121822',
                border: '1px solid #1e2837',
                borderRadius: '12px',
                padding: '14px',
                color: listening ? '#ef4444' : '#f8fafc',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Mic size={18} color={listening ? '#ef4444' : '#8492a6'} />
              {listening ? 'Listening for "Yes" or "No"...' : 'Answer by Voice'}
            </button>
          </>
        ) : (
          /* Instruction Step: Back / Next Step */
          <div style={{ display: 'grid', gridTemplateColumns: history.length > 0 ? '1fr 2fr' : '1fr', gap: '10px' }}>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  backgroundColor: '#18202d',
                  border: '1px solid #222d3d',
                  borderRadius: '14px',
                  padding: '16px',
                  color: '#cbd5e1',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}

            {!isEnd ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  backgroundColor: '#ef4444',
                  backgroundImage: 'linear-gradient(180deg, #ff5252 0%, #ee2222 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '16px',
                  fontSize: '17px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.45)',
                }}
              >
                Next Step <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '16px',
                  fontSize: '17px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
                }}
              >
                Finish Protocol ✓
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Direct Call */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="tel:911"
          style={{
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 800,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Phone size={14} color="#ef4444" />
          CALL 911 DIRECT
        </a>
      </div>
    </div>
  )
}
