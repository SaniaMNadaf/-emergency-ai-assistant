import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext()

const DEMO_ACCOUNTS = [
  { id: 'bystander', email: 'bystander@demo.com', password: 'demo', role: 'bystander', name: 'Emergency Bystander' },
  { id: 'doctor-1', email: 'doctor@demo.com', password: 'demo', role: 'doctor', name: 'Dr. Sarah Chen' },
  { id: 'family-1', email: 'family@demo.com', password: 'demo', role: 'family', name: 'Family Member' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (supabase) {
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setUser(data || { id: session.user.id, email: session.user.email })
        } else {
          setUser(null)
        }
        setLoading(false)
      })
    } else {
      const stored = localStorage.getItem('demo_user')
      if (stored) setUser(JSON.parse(stored))
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    if (!supabase) {
      const account = DEMO_ACCOUNTS.find(
        (a) => a.email === email && a.password === password
      )
      if (!account) throw new Error('Invalid credentials')
      const u = { id: account.id, email: account.email, role: account.role, name: account.name }
      localStorage.setItem('demo_user', JSON.stringify(u))
      setUser(u)
      return { user: u }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem('demo_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, DEMO_ACCOUNTS }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
