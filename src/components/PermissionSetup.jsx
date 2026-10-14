import { useState } from 'react'
import { requestGeolocation, requestMicrophone, requestCamera, requestNotification } from '../lib/permissions'
import { SpeechRecognizer, speak } from '../lib/speech'

const STEPS = ['idle', 'location', 'microphone', 'speech', 'done']

export default function PermissionSetup({ onReady }) {
  const [step, setStep] = useState('idle')
  const [location, setLocation] = useState(null)
  const [speechResult, setSpeechResult] = useState(null)
  const [error, setError] = useState(null)
  const [listening, setListening] = useState(false)

  const runAll = async () => {
    setError(null)

    setStep('location')
    try {
      const loc = await requestGeolocation()
      setLocation(loc)
    } catch (err) {
      setError(`Location: ${err.message || 'denied'}`)
    }

    setStep('microphone')
    const mic = await requestMicrophone()
    if (!mic.supported) {
      setError(`Microphone: ${mic.error || 'not available'}`)
    }

    setStep('speech')
    const cam = await requestCamera()
    if (!cam.supported) {
      setError(`Camera: ${cam.error || 'not available'}`)
    }
    await requestNotification()

    try {
      speak('All systems ready. This is a test of text-to-speech.', {
        onEnd: () => {
          localStorage.setItem('permissions_done', 'true')
          setStep('done')
          onReady()
        },
      })
    } catch {
      setStep('done')
      localStorage.setItem('permissions_done', 'true')
      onReady()
    }
  }

  const testSpeechRecognition = () => {
    if (!SpeechRecognizer.isSupported()) {
      setError('Speech recognition not supported in this browser')
      return
    }
    setError(null)
    setListening(true)
    setSpeechResult(null)

    let rec
    try {
      rec = new SpeechRecognizer(
        (transcript) => {
          setSpeechResult(transcript)
          speak(`You said: ${transcript}`)
        },
        (err) => {
          setError(`Speech: ${err}`)
          setListening(false)
        },
        () => {
          setListening(false)
        }
      )
      rec.start()
    } catch (err) {
      setError(`Speech: ${err.message}`)
      setListening(false)
    }

    setTimeout(() => {
      if (rec) rec.stop()
    }, 10000)
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
      <h1>Setup Permissions</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        This app needs location, camera, and microphone to work in emergencies.
        It will also test voice recognition and text-to-speech in English.
      </p>

      {step === 'idle' && (
        <button className="btn btn-primary" onClick={runAll}>
          Test All Permissions & Speech
        </button>
      )}

      {step === 'location' && <div className="card">Requesting location...</div>}
      {step === 'microphone' && <div className="card">Requesting microphone & camera...</div>}
      {step === 'speech' && <div className="card">Speaking a test message...</div>}

      {location && (
        <div className="card" style={{ marginTop: '16px' }}>
          <p><strong>✓ Location acquired</strong></p>
          <p style={{ fontSize: '14px' }}>Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
          <p style={{ fontSize: '14px' }}>Accuracy: ±{Math.round(location.accuracy)}m</p>
        </div>
      )}

      {step === 'done' && (
        <div className="card" style={{ marginTop: '16px' }}>
          <p><strong>✓ Text-to-speech test complete</strong></p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>You should have heard a voice speaking.</p>
          <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={testSpeechRecognition}>
            {listening ? 'Listening... tap to stop' : 'Test Voice Recognition (say something)'}
          </button>
          {listening && <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Listening for up to 10 seconds...</p>}
          {speechResult && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
              <p><strong>You said:</strong> {speechResult}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="banner banner-error" style={{ marginTop: '16px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
