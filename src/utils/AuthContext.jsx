import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminStatus = sessionStorage.getItem('isAdmin')
    if (adminStatus === 'true') setIsAdmin(true)
    setLoading(false)
  }, [])

  const loginAdmin = () => { setIsAdmin(true); sessionStorage.setItem('isAdmin', 'true') }
  const logoutAdmin = () => { setIsAdmin(false); sessionStorage.clear() }
  const setToken = () => {} // kept for compatibility

  if (loading) return null

  return (
    <AuthContext.Provider value={{ isAdmin, loginAdmin, logoutAdmin, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
