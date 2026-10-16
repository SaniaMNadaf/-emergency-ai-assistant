import { useState, useEffect, useRef } from 'react'
import { speak, speakStop, SpeechRecognizer } from '../lib/speech'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Banner } from './ui/Banner'
import { Mic, MicOff, Volume2, Phone, Check, X } from 'lucide-react'

export default function ProtocolRunner({ treeId, incidentId, user, onFinish, onCancel }) {
  const [tree, setTree] = useState(null)
  const [currentNodeId, setCurrentNodeId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [listening, setListening] = useState(false)
  const [history, setHistory] = useState([])
  const [_sessionId, setSessionId] = useState(null)
  const [guardStatus, setGuardStatus] = useState(null)
  const [guardLoading, setGuardLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const sessionIdRef = useRef(null)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

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
            setSessionId(sess.id)
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

  useEffect(() => {
    if (tree && currentNodeId) {
      const node = tree.nodes[currentNodeId]
      if (node && node.text) {
        speak(node.text)
      }
      const stepCount = Object.keys(tree.nodes).length
      const currentStep = history.length + 1
      setProgress((currentStep / stepCount) * 100)
    }
  }, [currentNodeId, tree, history])

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

      if (guardData.guard === 'block') {
        setGuardLoading(false)
        if (!confirm('⚠️ The protocol guard flagged this answer as potentially unsafe. Proceed anyway?')) {
          return
        }
      }
    } catch {
      setGuardStatus({ guard: 'ok', reason: 'Guard check failed — proceeding.' })
    } finally {
      setGuardLoading(false)
    }

    if (nextId) {
      setHistory(prev => [...prev, { nodeId: currentNodeId, answer: answerYes ? 'yes' : 'no' }])
      setCurrentNodeId(nextId)
    }
  }

  const handleNext = () => {
    if (!tree || !currentNodeId) return
    const node = tree.nodes[currentNodeId]
    const nextId = node.next
    if (nextId) {
      setHistory(prev => [...prev, { nodeId: currentNodeId, action: 'next' }])
      setCurrentNodeId(nextId)
    }
  }

  const startVoiceInput = () => {
    if (!SpeechRecognizer.isSupported()) return
    setListening(true)
    try {
      const rec = new SpeechRecognizer(
        (transcript) => {
          setListening(false)
          const lower = transcript.toLowerCase()
          const yesRegex = /\b(yes|yeah|yep)\b/i
          const noRegex = /\b(no|nope)\b/i

          if (yesRegex.test(lower)) {
            handleAnswer(true)
          } else if (noRegex.test(lower)) {
            handleAnswer(false)
          } else {
            alert(`Could not recognize yes/no in: "${transcript}". Please tap buttons.`)
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

  if (loading) return (
    <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--sp-3)' }}>Loading protocol...</p>
    </div>
  )
  if (error) return <Banner variant="error">Error: {error}</Banner>
  if (!tree || !currentNodeId) return (
    <div className="card text-center">
      <p style={{ color: 'var(--color-text-muted)' }}>Protocol unavailable offline.</p>
    </div>
  )

  const node = tree.nodes[currentNodeId]
  const isEnd = node.type === 'end'
  const isQuestion = node.type === 'question'

  return (
    <div style={{ paddingBottom: 'var(--sp-20)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <h2 style={{ margin: 0 }}>{tree.title}</h2>
        <button className="btn btn-outline btn-icon btn-sm" onClick={onCancel} aria-label="Exit protocol">✕</button>
      </div>

      <div style={{
        height: '6px',
        background: 'var(--color-border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: 'var(--sp-5)',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'var(--color-primary)',
          transition: 'width var(--transition-normal)',
        }} />
      </div>

      <Card style={{ padding: 'var(--sp-6)', textAlign: 'center', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, lineHeight: 1.4, marginBottom: 'var(--sp-5)' }}>
          {node.text}
        </p>

        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--sp-3)' }}>
          This is first-aid guidance, not a diagnosis. Call your local emergency number.
        </p>

        {guardStatus && guardLoading && (
          <div style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            🛡️ Checking protocol safety...
          </div>
        )}

        {guardStatus && !guardLoading && (
          <div style={{
            marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-2) var(--sp-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            backgroundColor: guardStatus.guard === 'block' ? 'rgba(220, 38, 38, 0.1)' : guardStatus.guard === 'warning' ? 'rgba(245, 152, 27, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: guardStatus.guard === 'block' ? 'var(--color-danger)' : guardStatus.guard === 'warning' ? 'var(--color-warning)' : 'var(--color-success)',
          }}>
            🛡️ Guard: {guardStatus.guard}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <button className="btn btn-outline" onClick={() => speak(node.text)}>
            <Volume2 size={20} /> Repeat
          </button>

          {isQuestion && (
            <>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button
                  className="btn btn-success"
                  style={{ flex: 1, minHeight: '64px', fontSize: 'var(--font-size-xl)' }}
                  onClick={() => handleAnswer(true)}
                >
                  <Check size={24} style={{ marginRight: 'var(--sp-2)' }} />
                  YES
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, minHeight: '64px', fontSize: 'var(--font-size-xl)' }}
                  onClick={() => handleAnswer(false)}
                >
                  <X size={24} style={{ marginRight: 'var(--sp-2)' }} />
                  NO
                </button>
              </div>
              <button
                className="btn btn-ghost"
                style={{ minHeight: '56px', marginTop: 'var(--sp-2)' }}
                onClick={startVoiceInput}
                aria-label={listening ? 'Listening for voice answer' : 'Answer by voice'}
              >
                {listening ? (
                  <>
                    <div className="spinner" style={{ width: '20px', height: '20px', marginRight: 'var(--sp-2)' }}></div>
                    Listening...
                  </>
                ) : (
                  <>
                    <Mic size={20} style={{ marginRight: 'var(--sp-2)' }} />
                    Answer by Voice
                  </>
                )}
              </button>
            </>
          )}

          {!isQuestion && !isEnd && node.next && (
            <Button variant="primary" onClick={handleNext}>
              NEXT STEP →
            </Button>
          )}

          {isEnd && (
            <Button variant="success" onClick={onFinish}>
              FINISH PROTOCOL
            </Button>
          )}

          <Button variant="outline" size="sm" fullWidth={false} style={{ marginTop: 'var(--sp-2)' }} onClick={() => window.open('tel:911', '_blank')} ariaLabel="Call emergency services">
            <Phone size={16} style={{ marginRight: 'var(--sp-1)' }} />
            Call Emergency Services
          </Button>
        </div>
      </Card>
    </div>
  )
}
