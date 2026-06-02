import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'

export default function AuthCallback() {
  const [status, setStatus] = useState('Autorizzazione in corso...')
  const [error, setError] = useState(null)
  const { setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Check hash fragment first (implicit flow: token in #access_token=...)
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const expiresIn = hashParams.get('expires_in')
        const errorHash = hashParams.get('error')

        // Also check query params (authorization code flow fallback)
        const queryParams = new URLSearchParams(window.location.search)
        const errorQuery = queryParams.get('error')

        if (errorHash || errorQuery) {
          throw new Error('Accesso Google negato: ' + (errorHash || errorQuery))
        }

        if (accessToken) {
          // Implicit flow success - we have the token directly
          setToken(accessToken, parseInt(expiresIn) || 3600)
          setStatus('Accesso completato! Reindirizzamento...')
          setTimeout(() => navigate('/dashboard', { replace: true }), 800)
          return
        }

        // Authorization code flow - exchange code for token
        const code = queryParams.get('code')
        if (code) {
          exchangeCode(code)
          return
        }

        throw new Error('Nessun token ricevuto da Google')

      } catch (err) {
        setError(err.message)
      }
    }

    const exchangeCode = async (code) => {
      try {
        setStatus('Scambio token in corso...')
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: window.location.origin + '/auth/callback'
          })
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Errore scambio token')
        }

        const data = await res.json()
        setToken(data.access_token, data.expires_in || 3600)
        setStatus('Accesso completato! Reindirizzamento...')
        setTimeout(() => navigate('/dashboard', { replace: true }), 800)
      } catch (err) {
        setError(err.message)
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.card} className="card fade-up">
        {error ? (
          <>
            <div style={styles.icon}>❌</div>
            <h2 style={styles.title}>Errore di autenticazione</h2>
            <p style={styles.text}>{error}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-gold" onClick={() => navigate('/dashboard')}>
                Riprova connessione
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                Vai alla dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <h2 style={styles.title}>Google Drive</h2>
            <p style={styles.text}>{status}</p>
          </>
        )}
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
    maxWidth: 400,
    width: '100%',
    padding: '60px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center'
  },
  icon: { fontSize: 48 },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 300,
    color: 'var(--text)'
  },
  text: { color: 'var(--text-dim)', fontSize: 14 }
}
