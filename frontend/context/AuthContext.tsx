'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getToken, logout } from '@/lib/auth'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  is_verified: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
  refresh: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchUser() {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  function signOut() {
    logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)