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

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAdmin) navigate('/dashboard', { replace: true })
  }, [isAdmin])

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!username || !password) {
      addToast('Inserisci username e password', 'error')
      return
    }
    setLoading(true)
    // Small delay for UX
    await new Promise(r => setTimeout(r, 600))

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      loginAdmin()
      addToast('Accesso effettuato ✦', 'success')
      navigate('/dashboard', { replace: true })
    } else {
      addToast('Credenziali non valide', 'error')
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card} className="card fade-up">
        <div style={styles.lockIcon}>🔐</div>
        <h1 style={styles.title}>Area Admin</h1>
        <p style={styles.subtitle}>Accesso riservato all'amministratore</p>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              className="input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                disabled={loading}
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            className="btn btn-gold"
            style={styles.loginBtn}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Accesso...</>
            ) : '✦ Accedi'}
          </button>
        </div>

        <a href="/" style={styles.backLink}>← Torna alla galleria ospiti</a>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  lockIcon: { fontSize: 40, marginBottom: 8, animation: 'float 3s ease-in-out infinite' },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 32,
    fontWeight: 300,
    color: 'var(--text)'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center'
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-dim)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase'
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4
  },
  loginBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '13px',
    marginTop: 8
  },
  backLink: {
    marginTop: 16,
    color: 'var(--text-muted)',
    fontSize: 13,
    textDecoration: 'none',
    transition: 'color 0.2s'
  }
}
