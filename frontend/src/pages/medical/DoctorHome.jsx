import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Bell,
  Volume2,
  VolumeX,
  Navigation,
  Radio,
  FileText,
  CheckCircle,
  MapPin,
  Clock,
  Heart,
  Activity,
  Layers,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react'

export default function DoctorHome({ user, onOpenAlert, onOpenDemoPanel, onLogout }) {
  const [responder, setResponder] = useState(null)
  const isDoctor = user?.role === 'doctor'
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // all | critical | resolved
  const [audioMuted, setAudioMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState([])
  const [activeNav, setActiveNav] = useState('alerts')

  const onOpenAlertRef = useRef(onOpenAlert)
  useEffect(() => {
    onOpenAlertRef.current = onOpenAlert
  }, [onOpenAlert])

  useEffect(() => {
    async function loadDoctorData() {
      if (!supabase) {
        setLoading(false)
        return
      }
      try {
        const { data: resp } = await supabase
          .from('responders')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (resp) {
          setResponder(resp)
          setIsOnline(resp.available ?? true)

          const { data: bData } = await supabase
            .from('broadcasts')
            .select('*, incidents(*)')
            .eq('responder_id', resp.id)
            .order('sent_at', { ascending: false })
            .limit(10)

          if (bData) setBroadcasts(bData)
        }
      } catch {
        // demo fallback
      } finally {
        setLoading(false)
      }
    }
    loadDoctorData()
  }, [user])

  // Realtime subscription for incoming alerts
  useEffect(() => {
    if (!supabase || !responder) return

    const channel = supabase
      .channel(`doctor-stream-${responder.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcasts', filter: `responder_id=eq.${responder.id}` },
        (payload) => {
          if (payload.new && payload.new.status === 'sent') {
            onOpenAlertRef.current?.(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [responder])

  const toggleAvailability = async (status) => {
    setIsOnline(status)
    if (supabase && responder) {
      await supabase.from('responders').update({ available: status }).eq('id', responder.id)
    }
  }

  // Simulated active critical broadcast for demo testing
  const demoActiveIncident = {
    id: 'demo-p1',
    tier: 1,
    title: 'Cardiac Arrest / Unresponsive',
    location: 'Market St & 4th St (0.2 mi east)',
    telemetry: 'AED Shock Delivered — Bystander CPR in progress',
    bpm: '142 bpm',
    eta: '01:42',
    status: 'sent',
  }

  const filteredBroadcasts = [
    {
      id: 'b1',
      title: 'Cardiac Arrest / Unresponsive',
      location: 'Market St & 4th St',
      distance: '0.2 mi away',
      tag: 'TIER 1 - PENDING HANDOFF',
      time: '4m ago',
      telemetry: 'AED applied, ROSC achieved',
      type: 'critical',
      responderUnit: 'Medic 14 En Route',
    },
    {
      id: 'b2',
      title: 'Severe Hemorrhage / Arterial Laceration',
      location: 'Mission & 16th St',
      distance: '0.9 mi away',
      tag: 'RESOLVED',
      time: 'Yesterday 18:43',
      telemetry: 'Tourniquet Protocol applied • Hemostasis stable',
      type: 'resolved',
      responderUnit: 'Trauma Ctr A',
    },
    {
      id: 'b3',
      title: 'Pediatric Respiratory Distress',
      location: '555 California St',
      distance: '1.1 mi away',
      tag: 'RESOLVED',
      time: '3 days ago',
      telemetry: 'Albuterol nebulizer delivered • SpO2 restored 98%',
      type: 'resolved',
      responderUnit: 'EMS Engine 02',
    },
  ].filter(b => activeTab === 'all' || (activeTab === 'critical' && b.type === 'critical') || (activeTab === 'resolved' && b.type === 'resolved'))

  return (
    <div style={{
      width: '100%',
      maxWidth: '1280px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#0a0e14',
      color: '#f8fafc',
      fontFamily: 'var(--font-family)',
      paddingBottom: '80px',
    }}>
      {/* Top Command Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #1e2837',
        backgroundColor: '#0d131d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f8fafc' }}>
            ALERTS COMMAND CONSOLE
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>• SFGH Traumatology On-Call</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '6px 10px',
              color: audioMuted ? '#ef4444' : '#10b981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {audioMuted ? 'Muted' : 'Audio On'}
          </button>

          <button
            onClick={onOpenDemoPanel}
            style={{
              background: '#121822',
              border: '1px solid #1e2837',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <Settings size={14} /> Demo Controls
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #1e2837', paddingLeft: '16px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
              color: '#ef4444',
            }}>
              SC
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Dr. Sarah Chen, MD</div>
              <div style={{ fontSize: '11px', color: '#8492a6' }}>Cardiology • Trauma Team 1</div>
            </div>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '6px' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Availability Toggle Switch */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #1e2837',
          borderRadius: '14px',
          padding: '6px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
        }}>
          <button
            onClick={() => toggleAvailability(true)}
            style={{
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: isOnline ? '#18202d' : 'transparent',
              border: isOnline ? '1px solid #2e3d52' : 'none',
              color: isOnline ? '#10b981' : '#64748b',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            Online Dispatch
          </button>

          <button
            onClick={() => toggleAvailability(false)}
            style={{
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: !isOnline ? '#18202d' : 'transparent',
              border: !isOnline ? '1px solid #2e3d52' : 'none',
              color: !isOnline ? '#ef4444' : '#64748b',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            Standby / Off
          </button>
        </div>

        {/* Priority P1 Dispatch Card */}
        <div style={{
          backgroundColor: '#121822',
          border: '1px solid #ef4444',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                PRIORITY P1
              </span>
              <span style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                ACCEPTED RESPONSE
              </span>
            </div>

            <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f59e0b' }}>
              ETA: {demoActiveIncident.eta}
            </div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
            {demoActiveIncident.title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ef4444', marginBottom: '16px' }}>
            <MapPin size={14} color="#ef4444" />
            {demoActiveIncident.location}
          </div>

          <div style={{
            backgroundColor: '#0a0e14',
            border: '1px solid #182230',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              <strong style={{ color: '#ef4444' }}>Telemetry Feed Synced:</strong> {demoActiveIncident.telemetry}
            </div>
            <div style={{
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}>
              {demoActiveIncident.bpm}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <button
              onClick={() => onOpenAlert(demoActiveIncident)}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
              }}
            >
              <Navigation size={18} />
              {isDoctor ? "Route Navigation (En Route)" : "Dispatch Ambulance & Triage"}
            </button>

            <button
              style={{
                backgroundColor: '#18202d',
                border: '1px solid #2e3d52',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Radio size={18} color="#06b6d4" />
              EMS Unit 14 Comms
            </button>
          </div>
        </div>

        {/* 30-Day Response Metrics 4-KPI Grid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
              <Activity size={16} color="#06b6d4" />
              30-DAY RESPONSE METRICS
            </div>
            <span style={{ fontSize: '11px', color: '#8492a6', border: '1px solid #1e2837', padding: '2px 8px', borderRadius: '4px' }}>
              Tier 1 Certified
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <div style={{ backgroundColor: '#121822', border: '1px solid #1e2837', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '8px' }}>
                Avg Response Time
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                3m 48s
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                ▼ -18s vs city avg
              </div>
            </div>

            <div style={{ backgroundColor: '#121822', border: '1px solid #1e2837', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '8px' }}>
                Total Responses
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                42 calls
              </div>
              <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>
                ● 100% on-station
              </div>
            </div>

            <div style={{ backgroundColor: '#121822', border: '1px solid #1e2837', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '8px' }}>
                Lives Stabilized
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                19 ROSC
              </div>
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                ♥ Critical field save
              </div>
            </div>

            <div style={{ backgroundColor: '#121822', border: '1px solid #1e2837', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#8492a6', textTransform: 'uppercase', marginBottom: '8px' }}>
                AED Deployed
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                07 units
              </div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                ⚡ Public Access AED
              </div>
            </div>
          </div>
        </div>

        {/* Broadcast Log Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Broadcast Log
              </h3>
              <span style={{ fontSize: '11px', color: '#8492a6', backgroundColor: '#18202d', padding: '2px 8px', borderRadius: '9999px' }}>
                3
              </span>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  backgroundColor: activeTab === 'all' ? '#ef4444' : '#121822',
                  color: '#ffffff',
                  border: '1px solid #1e2837',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                All Alerts (3)
              </button>
              <button
                onClick={() => setActiveTab('critical')}
                style={{
                  backgroundColor: activeTab === 'critical' ? '#ef4444' : '#121822',
                  color: '#ffffff',
                  border: '1px solid #1e2837',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Critical P1 (1)
              </button>
              <button
                onClick={() => setActiveTab('resolved')}
                style={{
                  backgroundColor: activeTab === 'resolved' ? '#ef4444' : '#121822',
                  color: '#ffffff',
                  border: '1px solid #1e2837',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Resolved (3)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredBroadcasts.map((b) => (
              <div
                key={b.id}
                style={{
                  backgroundColor: '#121822',
                  border: '1px solid #1e2837',
                  borderRadius: '14px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: b.type === 'critical' ? '#ef4444' : '#10b981',
                      backgroundColor: b.type === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>
                      {b.tag}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{b.time}</span>
                  </div>

                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#8492a6' }}>
                    {b.distance}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                      {b.title}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#8492a6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {b.location} • <span style={{ color: '#06b6d4' }}>{b.telemetry}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onOpenAlert({ ...demoActiveIncident, title: b.title })}
                      style={{
                        backgroundColor: '#18202d',
                        border: '1px solid #2e3d52',
                        color: '#f8fafc',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileText size={14} /> Clinical Log
                    </button>
                    <button
                      style={{
                        backgroundColor: '#18202d',
                        border: '1px solid #2e3d52',
                        color: '#10b981',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle size={14} /> Complete Handoff
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Tactical Dock */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#0d131d',
        borderTop: '1px solid #1e2837',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '48px',
        zIndex: 50,
      }}>
        <button
          onClick={() => setActiveNav('alerts')}
          style={{
            background: 'none',
            border: 'none',
            color: activeNav === 'alerts' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          <Bell size={18} />
          ALERTS
        </button>

        <button
          onClick={() => setActiveNav('radar')}
          style={{
            background: 'none',
            border: 'none',
            color: activeNav === 'radar' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          <Radio size={18} />
          ACTIVE RADAR
        </button>

        <button
          onClick={() => setActiveNav('guides')}
          style={{
            background: 'none',
            border: 'none',
            color: activeNav === 'guides' ? '#ef4444' : '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          <Layers size={18} />
          GUIDES
        </button>
      </nav>
    </div>
  )
}
