import { useEffect, useState } from 'react'
import { getPendingReportCount } from '../lib/broadcast'

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [mounted, setMounted] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    const updatePending = () => setPendingCount(getPendingReportCount())
    updatePending()
    const goOnline = () => {
      setOnline(true)
      updatePending()
    }
    const goOffline = () => {
      setOnline(false)
      updatePending()
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!mounted) return null

  // Remove the green online banner - only show when offline or when reports are syncing
  if (online && pendingCount === 0) {
    return null
  }

  return (
    <div className={`banner ${online ? 'banner-online' : 'banner-offline'}`}>
      <span className="status-dot" style={{ background: online ? '#16a34a' : '#dc2626' }}></span>
      {online ? 'Syncing reports...' : 'Offline — app continues to work'}
      {pendingCount > 0 && (
        <span style={{ fontSize: '12px', marginLeft: '8px' }}>
          ({pendingCount} pending {pendingCount === 1 ? 'report' : 'reports'} — will send when connection returns)
        </span>
      )}
    </div>
  )
}
