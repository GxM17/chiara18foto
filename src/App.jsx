import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GuestPage from './pages/GuestPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Toast from './components/Toast.jsx'
import { ToastProvider } from './utils/ToastContext.jsx'
import { AuthProvider, useAuth } from './utils/AuthContext.jsx'

function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Toast />
          <Routes>
            <Route path="/" element={<GuestPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
