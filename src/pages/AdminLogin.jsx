import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { useToast } from '../utils/ToastContext.jsx'

const ADMIN_USERNAME = 'Admin'
const ADMIN_PASSWORD = 'Chiara18!Admin'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { loginAdmin, isAdmin } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  React.useEffect(() => { if (isAdmin) navigate('/dashboard', { replace: true }) }, [isAdmin])

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!username || !password) { addToast('Inserisci username e password', 'error'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      loginAdmin()
      addToast('Benvenuta ✦', 'success')
      navigate('/dashboard', { replace: true })
    } else {
      addToast('Credenziali non valide', 'error')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,116,138,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,116,138,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 24, padding: '52px 44px', boxShadow: '0 12px 48px rgba(196,116,138,0.12)', border: '1px solid var(--border)' }} className="fade-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌸</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, color: 'var(--text)', marginBottom: 8 }}>Area Admin</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Accesso riservato all'amministratore</p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>Username</label>
            <input className="input" type="text" placeholder="Username" value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              disabled={loading} autoComplete="username" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                disabled={loading} autoComplete="current-password"
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 0, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button className="btn btn-rose" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 4 }}
            onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Accesso...</> : 'Accedi'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Torna alla pagina ospiti</a>
        </div>
      </div>
    </div>
  )
}
