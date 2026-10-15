import { useState, useEffect } from 'react'
import { useAuth } from './lib/auth'
import OfflineBanner from './components/OfflineBanner'
import Auth from './components/Auth'
import PermissionSetup from './components/PermissionSetup'
import BystanderHome from './components/BystanderHome'
import ReportScreen from './components/ReportScreen'
import StatusScreen from './components/StatusScreen'
import ProtocolRunner from './components/ProtocolRunner'
import DoctorHome from './components/DoctorHome'
import AlertScreen from './components/AlertScreen'
import PatientHome from './components/PatientHome'
import FamilyDashboard from './components/FamilyDashboard'
import DemoPanel from './components/DemoPanel'

export default function App() {
  const { user, loading, logout } = useAuth()
  const [permissionsDone, setPermissionsDone] = useState(false)

  // Navigation states
  const [bystanderView, setBystanderView] = useState('home') // home | report | status | protocol
  const [activeIncident, setActiveIncident] = useState(null)
  const [activeBroadcasts, setActiveBroadcasts] = useState([])
  const [initialTier, setInitialTier] = useState(1)
  const [activeProtocolId, setActiveProtocolId] = useState(null)

  const [doctorView, setDoctorView] = useState('home') // home | alert
  const [incomingBroadcast, setIncomingBroadcast] = useState(null)

  const [showDemoPanel, setShowDemoPanel] = useState(false)

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

  if (!user) return <Auth />
  if (!permissionsDone) return <PermissionSetup onReady={() => setPermissionsDone(true)} />

  // Render role-specific apps
  return (
    <div className="app">
      <OfflineBanner />

      {showDemoPanel && <DemoPanel user={user} onClose={() => setShowDemoPanel(false)} />}

      <main className="main-content">
        {user.role === 'bystander' && (
          <>
            {bystanderView === 'home' && (
              <BystanderHome
                user={user}
                onStartEmergency={() => setBystanderView('report')}
                onStartProtocol={(treeId) => {
                  setActiveProtocolId(treeId)
                  setBystanderView('protocol')
                }}
                onOpenDemoPanel={() => setShowDemoPanel(true)}
                onLogout={logout}
              />
            )}
            {bystanderView === 'report' && (
              <ReportScreen
                user={user}
                onReportSubmitted={({ incident, broadcasts, initialTier: tier }) => {
                  setActiveIncident(incident)
                  setActiveBroadcasts(broadcasts)
                  setInitialTier(tier || 1)
                  setBystanderView('status')
                }}
                onCancel={() => setBystanderView('home')}
              />
            )}
            {bystanderView === 'status' && (
              <StatusScreen
                incident={activeIncident}
                broadcasts={activeBroadcasts}
                initialTier={initialTier}
                onStartProtocol={() => {
                  setActiveProtocolId('cpr')
                  setBystanderView('protocol')
                }}
                onReset={() => {
                  setActiveIncident(null)
                  setActiveBroadcasts([])
                  setBystanderView('home')
                }}
              />
            )}
            {bystanderView === 'protocol' && (
              <ProtocolRunner
                treeId={activeProtocolId || 'cpr'}
                incidentId={activeIncident?.id}
                user={user}
                onFinish={() => setBystanderView('home')}
                onCancel={() => setBystanderView('home')}
              />
            )}
          </>
        )}

        {user.role === 'doctor' && (
          <>
            {doctorView === 'home' && (
              <DoctorHome
                user={user}
                onOpenAlert={(broadcast) => {
                  setIncomingBroadcast(broadcast)
                  setDoctorView('alert')
                }}
                onOpenDemoPanel={() => setShowDemoPanel(true)}
                onLogout={logout}
              />
            )}
            {doctorView === 'alert' && (
              <AlertScreen
                broadcast={incomingBroadcast}
                onResponded={() => setDoctorView('home')}
              />
            )}
          </>
        )}

        {user.role === 'patient' && (
          <PatientHome
            user={user}
            onOpenDemoPanel={() => setShowDemoPanel(true)}
            onLogout={logout}
          />
        )}

        {user.role === 'family' && (
          <FamilyDashboard
            user={user}
            onOpenDemoPanel={() => setShowDemoPanel(true)}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  )
}
