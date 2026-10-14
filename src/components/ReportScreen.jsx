import { useState, useEffect } from 'react'
import { requestGeolocation } from '../lib/permissions'
import { reportEmergency } from '../lib/broadcast'

export default function ReportScreen({ user, onReportSubmitted, onCancel }) {
  const [location, setLocation] = useState(null)
  const [locLoading, setLocLoading] = useState(true)
  const [locError, setLocError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

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
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await reportEmergency(user, location, photoFile)
      onReportSubmitted(result)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const hasGps = !!location
  const hasPhoto = !!photoFile
  const tier1Ready = hasGps && hasPhoto

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <h1>Report Emergency</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Confirm your location and attach a photo for Tier 1 doctor alerts.
      </p>

      {error && <div className="banner banner-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3>1. GPS Location</h3>
          {locLoading && <p>Acquiring GPS lock...</p>}
          {locError && <p style={{ color: 'var(--danger)' }}>GPS Error: {locError}. Tier 1 alert disabled.</p>}
          {location && (
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ GPS Locked</p>
              <p style={{ fontSize: '14px' }}>Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}</p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Accuracy: ±{Math.round(location.accuracy)}m</p>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <h3>2. Emergency Photo (Required for Tier 1)</h3>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ marginBottom: '12px', width: '100%' }}
          />
          {photoPreview && (
            <div style={{ marginTop: '8px' }}>
              <img src={photoPreview} alt="Incident preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
            </div>
          )}
        </div>

        {!tier1Ready && (
          <div className="banner banner-offline" style={{ marginBottom: '16px' }}>
            ⚠️ Without both GPS and photo, Tier 1 doctors will not be alerted immediately. You can still report and get protocol guidance.
          </div>
        )}

        <button type="submit" className="btn btn-danger" disabled={submitting} style={{ marginBottom: '12px' }}>
          {submitting ? 'Broadcasting...' : 'CONFIRM & BROADCAST EMERGENCY'}
        </button>

        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  )
}
