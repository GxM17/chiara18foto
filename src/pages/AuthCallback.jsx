import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'

export default function AuthCallback() {
  const [status, setStatus] = useState('Autorizzazione in corso...')
  const [error, setError] = useState(null)
  const { setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL params
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const errorParam = params.get('error')

        if (errorParam) {
          throw new Error('Accesso Google negato: ' + errorParam)
        }

        if (!code) {
          throw new Error('Codice di autorizzazione mancante')
        }

        setStatus('Scambio token in corso...')

        // Exchange code for token via our serverless function
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: window.location.origin + '/auth/callback' })
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Errore durante lo scambio del token')
        }

        const data = await res.json()
        setToken(data.access_token, data.expires_in || 3600)

        setStatus('Accesso completato! Reindirizzamento...')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000)

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
            <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
              Riprova
            </button>
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
