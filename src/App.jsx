import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import OfflineBanner from './components/OfflineBanner'
import Auth from './components/Auth'
import PermissionSetup from './components/PermissionSetup'
import Home from './components/Home'

function App() {
  const { user, loading } = useAuth()
  const [permissionsDone, setPermissionsDone] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('permissions_done') === 'true'
    setPermissionsDone(done)
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="app">
      <OfflineBanner />
      <main className="main-content">
        {!user ? (
          <Auth />
        ) : !permissionsDone ? (
          <PermissionSetup onReady={() => setPermissionsDone(true)} />
        ) : (
          <Home user={user} />
        )}
      </main>
    </div>
  )
}

export default App
