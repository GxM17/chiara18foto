import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [googleToken, setGoogleToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check session storage for admin status and google token
    const adminStatus = sessionStorage.getItem('isAdmin')
    const token = sessionStorage.getItem('googleToken')
    const tokenExpiry = sessionStorage.getItem('googleTokenExpiry')

    if (adminStatus === 'true') setIsAdmin(true)
    if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setGoogleToken(token)
    } else if (token) {
      // Token expired, clear it
      sessionStorage.removeItem('googleToken')
      sessionStorage.removeItem('googleTokenExpiry')
    }
    setLoading(false)
  }, [])

  const loginAdmin = () => {
    setIsAdmin(true)
    sessionStorage.setItem('isAdmin', 'true')
  }

  const logoutAdmin = () => {
    setIsAdmin(false)
    setGoogleToken(null)
    sessionStorage.clear()
  }

  const setToken = (token, expiresIn = 3600) => {
    setGoogleToken(token)
    sessionStorage.setItem('googleToken', token)
    sessionStorage.setItem('googleTokenExpiry', Date.now() + expiresIn * 1000)
  }

  if (loading) return null

  return (
    <AuthContext.Provider value={{ isAdmin, googleToken, loginAdmin, logoutAdmin, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
