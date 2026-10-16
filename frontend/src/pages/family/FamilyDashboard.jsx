import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Bell,
  Heart,
  Activity,
  AlertTriangle,
  Phone,
  MessageSquare,
  Shield,
  MapPin,
  CheckCircle,
  Clock,
  Compass,
  Users,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react'

export default function FamilyDashboard({ user, onOpenDemoPanel, onLogout }) {
  const [hasAccess, setHasAccess] = useState(true) // default true for demo
  const [patient, setPatient] = useState({ name: 'Eleanor Vance', age: 74 })
  const [isEmergencyMode, setIsEmergencyMode] = useState(true)
  const [activeTab, setActiveTab] = useState('circle')
  const [loading, setLoading] = useState(false)
  const [readings, setReadings] = useState([])
  const [incidents, setIncidents] = useState([])

  useEffect(() => {
    async function checkAccessAndLoad() {
      if (!supabase) return

      try {
        const { data: linkData } = await supabase
          .from('care_links')
          .select('*, users!care_links_patient_id_fkey(*)')
          .eq('family_id', user.id)
          .eq('active', true)
          .single()

        if (linkData && linkData.users) {
          setHasAccess(true)
          const pat = linkData.users
          setPatient(pat)

          const { data: rData } = await supabase
            .from('readings')
            .select('*')
            .eq('patient_id', pat.id)
            .order('taken_at', { ascending: false })
            .limit(10)
          if (rData) setReadings(rData)

          const { data: iData } = await supabase
            .from('incidents')
            .select('*')
            .eq('reporter_id', pat.id)
            .order('created_at', { ascending: false })
          if (iData) setIncidents(iData)
        }
      } catch {
        // demo fallback
      } finally {
        setLoading(false)
      }
    }
    checkAccessAndLoad()
  }, [user])

  return (
    <div style={{
      maxWidth: '460px',
      margin: '0 auto',
      width: '100%',
      paddingBottom: '80px',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '9999px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#f8fafc',
          cursor: 'pointer',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          FAMILY CIRCLE <ChevronDown size={14} color="#8492a6" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenDemoPanel}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#121822',
              border: '1px solid #1e2837',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>

          <button
            onClick={onLogout}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '13px',
            }}
            aria-label="Logout"
          >
            👤
          </button>
        </div>
      </div>

      {/* Mode Segmented Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '20px',
      }}>
        <button
          onClick={() => setIsEmergencyMode(true)}
          style={{
            backgroundColor: isEmergencyMode ? '#ef4444' : '#121822',
            color: '#ffffff',
            border: isEmergencyMode ? 'none' : '1px solid #1e2837',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: isEmergencyMode ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
          }}
        >
          <AlertTriangle size={14} />
          EMERGENCY MODE
        </button>

        <button
          onClick={() => setIsEmergencyMode(false)}
          style={{
            backgroundColor: !isEmergencyMode ? '#10b981' : '#121822',
            color: '#ffffff',
            border: !isEmergencyMode ? 'none' : '1px solid #1e2837',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Shield size={14} />
          SAFE MODE
        </button>
      </div>

      {/* Critical SOS Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #ef4444',
        borderRadius: '18px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#ef4444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              PRIORITY 1 CRITICAL SOS
            </span>
          </div>

          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#f59e0b', fontWeight: 800 }}>
            T+02:16
          </span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
          {patient?.name || 'Eleanor Vance'} triggered SOS Alert
        </h2>

        <div style={{ fontSize: '12px', color: '#8492a6', marginBottom: '16px' }}>
          Automated wearable fall detection confirmed • Market St & 4th St, SF
        </div>

        {/* 3-Col Vitals Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '4px' }}>
              Heart Rate
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
              118 <span style={{ fontSize: '11px' }}>BPM</span>
            </div>
            <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>
              Elevated (Spike)
            </div>
          </div>

          <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '4px' }}>
              Blood Oxygen
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              96 <span style={{ fontSize: '11px' }}>%</span>
            </div>
            <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 700 }}>
              Acceptable
            </div>
          </div>

          <div style={{ backgroundColor: '#0a0e14', border: '1px solid #182230', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '4px' }}>
              Kinetic Impact
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              2.4 <span style={{ fontSize: '11px' }}>G</span>
            </div>
            <div style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700 }}>
              Fall Pattern
            </div>
          </div>
        </div>
      </div>

      {/* Live Radar Map Widget Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '18px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        {/* Radar Graphic */}
        <div style={{
          height: '140px',
          borderRadius: '12px',
          backgroundColor: '#0a0e14',
          border: '1px solid #182230',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}>
          <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', border: '1px dashed rgba(239, 68, 68, 0.2)' }} />
          <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }} />
          {/* Target */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          </div>

          {/* Responder ping */}
          <span style={{
            position: 'absolute',
            top: '20px',
            right: '40px',
            fontSize: '10px',
            fontWeight: 800,
            backgroundColor: '#18202d',
            border: '1px solid #2e3d52',
            padding: '2px 8px',
            borderRadius: '4px',
            color: '#06b6d4',
          }}>
            ● Medic 14 • 0.4 mi
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
            GPS: 37.7858° N, 122.4065° W
          </span>
          <button style={{
            background: '#18202d',
            border: '1px solid #2e3d52',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            ⛶ Live Radar
          </button>
        </div>

        {/* Responder Lead Card */}
        <div style={{
          backgroundColor: '#0a0e14',
          border: '1px solid #182230',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
              fontWeight: 800,
            }}>
              ✻
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                Dr. Sarah Chen <span style={{ color: '#06b6d4' }}>✓</span>
              </div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>
                Medic 14 Paramedic Lead • SFGH Trauma
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#8492a6', textTransform: 'uppercase' }}>ETA</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              3 min
            </div>
          </div>
        </div>
      </div>

      {/* Incident Dispatch Telemetry Stepper */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '18px',
        padding: '18px 20px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#06b6d4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            INCIDENT DISPATCH TELEMETRY
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
            CAD #SF-88902
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Emergency 911 CAD Triaged</div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>Automated biometric payload transmitted</div>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>14:31:02</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>SF General Trauma ER Standing By</div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>Cardiology record & allergy tags synced</div>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>14:31:45</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>Medic 14 Intercept En Route</div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>Approaching 4th & Mission Intersection</div>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>14:32:10</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.6 }}>
            <Clock size={16} color="#8492a6" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Scene Arrival & Field Stabilization</div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>Pending physical responder contact</div>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>ETA 3m</span>
          </div>
        </div>
      </div>

      {/* Contact Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
        <a
          href="tel:911"
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '13px',
            fontWeight: 800,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Phone size={16} /> Call Contact
        </a>

        <button
          style={{
            backgroundColor: '#121822',
            border: '1px solid #1e2837',
            color: '#f8fafc',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <MessageSquare size={16} color="#f59e0b" /> Circle Chat
        </button>
      </div>

      {/* Primary Guardian Card */}
      <div style={{
        backgroundColor: '#121822',
        border: '1px solid #1e2837',
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#18202d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#cbd5e1',
          fontSize: '12px',
        }}>
          DV
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Primary Guardian: David Vance (Son)</div>
          <div style={{ fontSize: '11px', color: '#8492a6' }}>Designated Power of Attorney • +1 (415) 555-0144</div>
        </div>
      </div>

      {/* HIPAA & Audit Notice */}
      <div style={{
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '11px',
        color: '#94a3b8',
        lineHeight: 1.4,
      }}>
        <CheckCircle size={16} color="#06b6d4" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#f8fafc' }}>HIPAA & Circle Audit Active:</strong> All vitals, dispatch actions, and responder contacts are logged to Eleanor Vance&apos;s patient record.
        </span>
      </div>

      {/* Bottom Tab Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: '#0a0e14',
        borderTop: '1px solid #1e2837',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '36px',
        zIndex: 50,
      }}>
        <button
          onClick={() => setActiveTab('circle')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'circle' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          CIRCLE
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'telemetry' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Activity size={16} />
          TELEMETRY
        </button>

        <button
          onClick={() => setActiveTab('map')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'map' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Compass size={16} />
          MAP
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'settings' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <Settings size={16} />
          SETTINGS
        </button>
      </nav>
    </div>
  )
}
