import { useState, useEffect } from 'react'
import { requestGeolocation } from '../../lib/permissions'
import { reportEmergency } from '../../lib/broadcast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Banner } from '../../components/ui/Banner'
import { Badge } from '../../components/ui/Badge'
import { Upload, MapPin, FileText } from 'lucide-react'

const steps = [
  { number: 1, label: 'Incident Type', icon: FileText },
  { number: 2, label: 'Photo', icon: Upload },
  { number: 3, label: 'Location', icon: MapPin },
]

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
    <div style={{ paddingBottom: 'var(--sp-20)' }}>
      <h1>Report Emergency</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--sp-4)' }}>
        Confirm your location and attach a photo for Tier 1 doctor alerts.
      </p>

      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
          {steps.map((step) => {
            const isActive = step.number === (tier1Ready ? 3 : hasGps ? 3 : hasPhoto ? 2 : 1)
            const isComplete = step.number < (tier1Ready ? 3 : hasGps ? 3 : hasPhoto ? 2 : 1)
            return (
              <div key={step.number} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isComplete ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    color: isComplete || isActive ? 'var(--color-primary-contrast)' : 'var(--color-text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {isComplete && '✓'}
                  {!isComplete && step.number}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--sp-1)' }}>
                  {step.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {error && <Banner variant="error" style={{ marginBottom: 'var(--sp-4)' }}>{error}</Banner>}

      <form onSubmit={handleSubmit}>
        <Card title="3. GPS Location" style={{ marginBottom: 'var(--sp-4)' }}>
          {locLoading && <p style={{ color: 'var(--color-text-muted)' }}>Acquiring GPS lock...</p>}
          {locError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>GPS Error: {locError}. Tier 1 alert disabled.</p>
          )}
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-lg)' }}>✓</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>GPS Locked</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}
                </p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Accuracy: ±{Math.round(location.accuracy)}m</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="2. Emergency Photo (Required for Tier 1)" style={{ marginBottom: 'var(--sp-4)' }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ width: '100%', marginBottom: 'var(--sp-3)', fontSize: 'var(--font-size-sm)' }}
          />
          {photoPreview && (
            <img src={photoPreview} alt="Incident preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginTop: 'var(--sp-2)' }} />
          )}
        </Card>

        {!tier1Ready && (
          <Banner variant="warning" style={{ marginBottom: 'var(--sp-4)' }}>
            ⚠️ Without both GPS and photo, Tier 1 doctors will not be alerted immediately. You can still report and get protocol guidance.
          </Banner>
        )}

        <Button type="submit" variant="danger" loading={submitting} style={{ marginBottom: 'var(--sp-3)' }}>
          {submitting ? 'Broadcasting...' : 'CONFIRM & BROADCAST EMERGENCY'}
        </Button>

        <Button type="button" variant="ghost" onClick={onCancel} fullWidth={false} className="btn-inline">
          Cancel
        </Button>
      </form>
    </div>
  )
}
