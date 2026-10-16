import { useState } from 'react'
import { requestGeolocation, requestMicrophone, requestCamera, requestNotification } from '../lib/permissions'
import { SpeechRecognizer, speak } from '../lib/speech'

export default function PermissionSetup({ onReady }) {
  const [step, setStep] = useState('idle')
  const [location, setLocation] = useState(null)
  const [hasMic, setHasMic] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [errors, setErrors] = useState([])
  const [listening, setListening] = useState(false)
  const [speechResult, setSpeechResult] = useState(null)

  const addError = (msg) => setErrors((prev) => [...prev, msg])

  const runAll = async () => {
    setErrors([])
    setStep('location')

    try {
      const loc = await requestGeolocation()
      setLocation(loc)
    } catch (err) {
      addError(`Location: ${err.message || 'permission denied'}`)
    }

    setStep('microphone')

    const mic = await requestMicrophone()
    setHasMic(mic.supported)
    if (!mic.supported) addError(`Microphone: ${mic.error}`)

    const cam = await requestCamera()
    setHasCamera(cam.supported)
    if (!cam.supported) addError(`Camera: ${cam.error}`)

    await requestNotification()

    setStep('speech')
    speak('All systems ready. This is a test of text-to-speech.')

    setTimeout(() => setStep('done'), 1000)
  }

  const handleContinue = () => {
    localStorage.setItem('permissions_done', 'true')
    onReady()
  }

  const testSpeechRecognition = () => {
    if (!SpeechRecognizer.isSupported()) {
      addError('Speech recognition not supported in this browser')
      return
    }

    setListening(true)
    setSpeechResult(null)

    let stopped = false
    let rec
    try {
      rec = new SpeechRecognizer(
        (transcript) => {
          setSpeechResult(transcript)
          speak(`You said: ${transcript}`)
        },
        (err) => {
          if (stopped) return
          addError(`Speech: ${err}`)
          setListening(false)
        },
        () => {
          setListening(false)
        }
      )
      rec.start()
    } catch (err) {
      addError(`Speech: ${err.message}`)
      setListening(false)
      return
    }

    setTimeout(() => {
      if (!stopped) {
        stopped = true
        rec?.stop()
      }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-danger" onClick={runAll}>
            Test Permissions & Speak
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ color: '#cbd5e1', borderColor: '#2e3d52' }}
            onClick={handleContinue}
          >
            Skip for Now & Open Console →
          </button>
        </div>
      )}

      {step === 'location' && <div className="card">Requesting location...</div>}
      {step === 'microphone' && <div className="card">Requesting microphone & camera...</div>}
      {step === 'speech' && <div className="card">Speaking: "All systems ready..."</div>}

      {location && (
        <div className="card" style={{ marginTop: '16px' }}>
          <p><strong>Location acquired</strong></p>
          <p style={{ fontSize: '14px' }}>Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
          <p style={{ fontSize: '14px' }}>Accuracy: ±{Math.round(location.accuracy)}m</p>
        </div>
      )}

      {step === 'done' && (
        <div className="card" style={{ marginTop: '16px' }}>
          <p><strong>Permission tests complete</strong></p>
          <ul style={{ fontSize: '14px', marginTop: '8px', paddingRight: '20px' }}>
            <li>Microphone: {hasMic ? 'available' : 'not available'}</li>
            <li>Camera: {hasCamera ? 'available' : 'not available'}</li>
            <li>Location: {location ? 'available' : 'not available'}</li>
          </ul>

          {SpeechRecognizer.isSupported() && (
            <>
              <button
                className="btn btn-outline"
                style={{ marginTop: '16px' }}
                onClick={testSpeechRecognition}
                disabled={listening}
              >
                {listening ? 'Listening...' : 'Test Voice Recognition (say something)'}
              </button>
              {listening && <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Listening for up to 10 seconds...</p>}
              {speechResult && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                  <p><strong>You said:</strong> {speechResult}</p>
                </div>
              )}
            </>
          )}

          {!SpeechRecognizer.isSupported() && (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '16px' }}>
              Speech recognition not supported in this browser. Tap-to-answer will be used.
            </p>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="banner banner-error" style={{ marginTop: '16px' }}>
          {errors.join('; ')}
        </div>
      )}

      {step === 'done' && (
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleContinue}>
          Continue to App
        </button>
      )}
    </div>
  )
}
