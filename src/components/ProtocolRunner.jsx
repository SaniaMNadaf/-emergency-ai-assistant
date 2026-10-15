import { useState, useEffect, useRef } from 'react'
import { speak, speakStop, SpeechRecognizer } from '../lib/speech'
import { supabase } from '../lib/supabase'

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

  // Update session by id as steps change
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
    }
  }, [currentNodeId, tree])

  const handleAnswer = async (answerYes) => {
    if (!tree || !currentNodeId) return
    const node = tree.nodes[currentNodeId]
    const nextId = answerYes ? node.yes : node.no

    // Call protocol-guard API for safety check
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
        // Block the action and warn the user
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
    if (!SpeechRecognizer.isSupported()) {
      alert('Speech recognition not supported in this browser. Please use buttons.')
      return
    }
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

  if (loading) return <div className="card text-center">Loading protocol...</div>
  if (error) return <div className="banner banner-error">Error: {error}</div>
  if (!tree || !currentNodeId) return <div className="card text-center">Protocol unavailable offline.</div>

  const node = tree.nodes[currentNodeId]
  const isEnd = node.type === 'end'
  const isQuestion = node.type === 'question'

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{tree.title}</h2>
        <button className="btn btn-outline" style={{ width: 'auto', padding: '8px 16px', fontSize: '14px' }} onClick={onCancel}>
          Exit
        </button>
      </div>

      <div className="card" style={{ padding: '24px', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.4, marginBottom: '24px' }}>
          {node.text}
        </p>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          This is first-aid guidance, not a diagnosis. Call your local emergency number.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => speak(node.text)} style={{ flex: 1, minWidth: '120px' }}>
            🔊 Repeat
          </button>

          {isQuestion && (
            <>
              <button className="btn btn-primary" onClick={() => handleAnswer(true)} style={{ flex: 2, background: 'var(--success)' }}>
                YES
              </button>
              <button className="btn btn-danger" onClick={() => handleAnswer(false)} style={{ flex: 2 }}>
                NO
              </button>
              <button className="btn btn-outline" onClick={startVoiceInput} style={{ flex: '1 0 100%', marginTop: '8px' }}>
                {listening ? '🎤 Listening for Yes/No...' : '🎤 Answer by Voice'}
              </button>
            </>
          )}

        {!isQuestion && !isEnd && node.next && (
          <button className="btn btn-primary" onClick={handleNext} style={{ flex: 2 }}>
            NEXT STEP →
          </button>
        )}

        {isEnd && (
          <button className="btn btn-primary" onClick={onFinish} style={{ flex: 2, background: 'var(--success)' }}>
            FINISH PROTOCOL
          </button>
        )}
        </div>

        {guardStatus && (
          <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', backgroundColor: guardStatus.guard === 'block' ? 'rgba(220, 38, 38, 0.1)' : guardStatus.guard === 'warning' ? 'rgba(245, 152, 27, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: guardStatus.guard === 'block' ? '#dc2626' : guardStatus.guard === 'warning' ? '#f59e0b' : '#22c55e' }}>
            {guardLoading ? '🛡️ Checking...' : `🛡️ Guard: ${guardStatus.guard}${guardStatus.reason ? ' — ' + guardStatus.reason.substring(0, 100) : ''}`}
          </div>
        )}
      </div>
    </div>
  )
}
