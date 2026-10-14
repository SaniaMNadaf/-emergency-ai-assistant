import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className={`banner ${online ? 'banner-online' : 'banner-offline'}`}>
      <span className="status-dot" style={{ background: online ? '#16a34a' : '#dc2626' }}></span>
      {online ? 'Online' : 'Offline — app continues to work'}
    </div>
  )
}
