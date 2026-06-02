import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { useToast } from '../utils/ToastContext.jsx'

const GOOGLE_CLIENT_ID = '768659933488-nkj4tde7p0ido6dr29tqnm5ina5jqrgh.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive'

export default function AdminDashboard() {
  const { logoutAdmin, googleToken, setToken } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [lightbox, setLightbox] = useState(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [stats, setStats] = useState({ total: 0, guests: 0 })
  const [filterGuest, setFilterGuest] = useState('all')
  const [guestList, setGuestList] = useState([])

  const isConnected = !!googleToken

  // Connect to Google Drive - using implicit flow (token directly in redirect)
  const connectGoogle = () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin + '/auth/callback',
      response_type: 'token',
      scope: SCOPES,
      prompt: 'consent'
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  // Fetch photos from backend
  const fetchPhotos = useCallback(async () => {
    if (!googleToken) return
    setLoadingPhotos(true)
    try {
      const res = await fetch('/api/photos', {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      })
      if (!res.ok) {
        if (res.status === 401) {
          addToast('Sessione Google scaduta. Riconnetti Drive.', 'error')
          return
        }
        throw new Error('Errore nel caricamento delle foto')
      }
      const data = await res.json()
      setPhotos(data.photos || [])

      // Compute stats
      const guests = [...new Set((data.photos || []).map(p => p.guestName).filter(Boolean))]
      setGuestList(guests)
      setStats({ total: data.photos?.length || 0, guests: guests.length })
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoadingPhotos(false)
    }
  }, [googleToken])

  useEffect(() => {
    if (googleToken) fetchPhotos()
  }, [googleToken])

  // Filtered photos
  const filteredPhotos = filterGuest === 'all'
    ? photos
    : photos.filter(p => p.guestName === filterGuest)

  // Toggle selection
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(filteredPhotos.map(p => p.id)))
  const clearSelection = () => setSelected(new Set())

  // Download single photo
  const downloadPhoto = async (photo) => {
    try {
      const res = await fetch(`/api/download/${photo.id}`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      })
      if (!res.ok) throw new Error('Errore download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.name || `foto_${photo.id}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      addToast('Errore durante il download: ' + err.message, 'error')
    }
  }

  // Download selected or all
  const downloadSelected = async () => {
    const toDownload = selected.size > 0
      ? photos.filter(p => selected.has(p.id))
      : filteredPhotos

    if (toDownload.length === 0) {
      addToast('Nessuna foto da scaricare', 'info')
      return
    }

    setDownloadingAll(true)
    addToast(`Download di ${toDownload.length} foto in corso...`, 'info')

    try {
      // Download as zip via backend
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify({ fileIds: toDownload.map(p => p.id) })
      })

      if (!res.ok) throw new Error('Errore creazione ZIP')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `foto_chiara18_${new Date().toISOString().slice(0,10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      addToast(`${toDownload.length} foto scaricate con successo!`, 'success')
    } catch (err) {
      addToast('Errore download: ' + err.message, 'error')
    } finally {
      setDownloadingAll(false)
    }
  }

  // Delete photo
  const deletePhoto = async (photo) => {
    if (!confirm(`Eliminare "${photo.name}"? Questa azione è irreversibile.`)) return
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleToken}` }
      })
      if (!res.ok) throw new Error('Errore eliminazione')
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setSelected(prev => { const n = new Set(prev); n.delete(photo.id); return n })
      setLightbox(null)
      addToast('Foto eliminata', 'success')
    } catch (err) {
      addToast('Errore: ' + err.message, 'error')
    }
  }

  const handleLogout = () => {
    logoutAdmin()
    navigate('/admin', { replace: true })
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle} className="shimmer-text">Dashboard Admin</h1>
          <p style={styles.headerSub}>I 18 anni di Chiara · Raccolta foto</p>
        </div>
        <div style={styles.headerRight}>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: 13 }}>
            Esci
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard} className="card">
            <span style={styles.statNum}>{stats.total}</span>
            <span style={styles.statLabel}>Foto totali</span>
          </div>
          <div style={styles.statCard} className="card">
            <span style={styles.statNum}>{stats.guests}</span>
            <span style={styles.statLabel}>Ospiti</span>
          </div>
          <div style={styles.statCard} className="card">
            <span style={styles.statNum}>{selected.size}</span>
            <span style={styles.statLabel}>Selezionate</span>
          </div>
        </div>

        {/* Google Drive connection */}
        {!isConnected ? (
          <div style={styles.connectCard} className="card fade-up">
            <div style={styles.driveIcon}>📁</div>
            <h2 style={styles.connectTitle}>Connetti Google Drive</h2>
            <p style={styles.connectText}>
              Per visualizzare e scaricare le foto, connetti il tuo account Google Drive.
              Le foto sono salvate nella cartella <strong style={{ color: 'var(--gold)' }}>Chiara18</strong>.
            </p>
            <button className="btn btn-gold" onClick={connectGoogle} style={{ marginTop: 8 }}>
              <span>🔗</span> Connetti Google Drive
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <select
                  style={styles.filterSelect}
                  value={filterGuest}
                  onChange={e => setFilterGuest(e.target.value)}
                >
                  <option value="all">Tutti gli ospiti</option>
                  {guestList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                <button className="btn btn-ghost" onClick={fetchPhotos} style={{ fontSize: 13 }} disabled={loadingPhotos}>
                  {loadingPhotos ? '↻ Aggiornamento...' : '↻ Aggiorna'}
                </button>
              </div>

              <div style={styles.toolbarRight}>
                {selected.size > 0 && (
                  <button className="btn btn-ghost" onClick={clearSelection} style={{ fontSize: 13 }}>
                    ✕ Deseleziona
                  </button>
                )}
                <button className="btn btn-ghost" onClick={selectAll} style={{ fontSize: 13 }}>
                  Seleziona tutte
                </button>
                <button
                  className="btn btn-gold"
                  onClick={downloadSelected}
                  disabled={downloadingAll}
                  style={{ fontSize: 13 }}
                >
                  {downloadingAll ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Download...</>
                  ) : (
                    <>⬇ {selected.size > 0 ? `Scarica (${selected.size})` : 'Scarica tutte'}</>
                  )}
                </button>
              </div>
            </div>

            {/* Photo grid */}
            {loadingPhotos ? (
              <div style={styles.loadingState}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Caricamento foto...</p>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>📷</p>
                <p style={styles.emptyText}>
                  {photos.length === 0 ? 'Nessuna foto ancora caricata.' : 'Nessuna foto per questo ospite.'}
                </p>
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredPhotos.map(photo => (
                  <div
                    key={photo.id}
                    style={{
                      ...styles.photoCard,
                      ...(selected.has(photo.id) ? styles.photoCardSelected : {})
                    }}
                    onClick={() => setLightbox(photo)}
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.name}
                      style={styles.photoImg}
                      loading="lazy"
                    />
                    <div style={styles.photoOverlay}>
                      <button
                        style={{
                          ...styles.checkBtn,
                          ...(selected.has(photo.id) ? styles.checkBtnActive : {})
                        }}
                        onClick={e => { e.stopPropagation(); toggleSelect(photo.id) }}
                      >
                        {selected.has(photo.id) ? '✓' : ''}
                      </button>
                    </div>
                    <div style={styles.photoMeta}>
                      <span style={styles.photoGuest}>📷 {photo.guestName || 'Ospite'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={styles.lightboxBg} onClick={() => setLightbox(null)}>
          <div style={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name} style={styles.lightboxImg} />
            <div style={styles.lightboxInfo}>
              <div>
                <p style={styles.lightboxName}>{lightbox.name}</p>
                <p style={styles.lightboxMeta}>
                  👤 {lightbox.guestName || 'Ospite'} · {lightbox.uploadedAt ? new Date(lightbox.uploadedAt).toLocaleDateString('it-IT') : ''}
                </p>
              </div>
              <div style={styles.lightboxActions}>
                <button className="btn btn-gold" onClick={() => downloadPhoto(lightbox)}>
                  ⬇ Scarica
                </button>
                <button className="btn btn-ghost" onClick={() => deletePhoto(lightbox)} style={{ color: '#fca5a5' }}>
                  🗑 Elimina
                </button>
                <button className="btn btn-ghost" onClick={() => setLightbox(null)}>
                  ✕ Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '20px 32px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(13,6,24,0.8)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerLeft: {},
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 24,
    fontWeight: 300
  },
  headerSub: { color: 'var(--text-muted)', fontSize: 13 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  content: { padding: '28px 32px', flex: 1 },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 28
  },
  statCard: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontSize: 40,
    fontWeight: 300,
    color: 'var(--gold)',
    lineHeight: 1
  },
  statLabel: { color: 'var(--text-muted)', fontSize: 13 },
  connectCard: {
    padding: '60px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: 500,
    margin: '0 auto'
  },
  driveIcon: { fontSize: 56 },
  connectTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 300,
    color: 'var(--text)'
  },
  connectText: { color: 'var(--text-dim)', lineHeight: 1.7, fontSize: 14 },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12
  },
  toolbarLeft: { display: 'flex', gap: 10, alignItems: 'center' },
  toolbarRight: { display: 'flex', gap: 8, alignItems: 'center' },
  filterSelect: {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12
  },
  photoCard: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: '1',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease'
  },
  photoCardSelected: {
    border: '2px solid var(--gold)',
    boxShadow: '0 0 0 2px rgba(201,168,76,0.3)'
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  checkBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.6)',
    background: 'rgba(0,0,0,0.4)',
    cursor: 'pointer',
    color: 'white',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    transition: 'all 0.2s'
  },
  checkBtnActive: {
    background: 'var(--gold)',
    border: '2px solid var(--gold)',
    color: '#000'
  },
  photoMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px 10px 8px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
  },
  photoGuest: { color: '#fff', fontSize: 12 },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 0'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 0'
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'var(--text-muted)', fontSize: 15 },
  lightboxBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    animation: 'fadeIn 0.2s ease'
  },
  lightboxContent: {
    background: 'var(--surface)',
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 900,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  lightboxImg: {
    width: '100%',
    maxHeight: '65vh',
    objectFit: 'contain',
    background: '#000'
  },
  lightboxInfo: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderTop: '1px solid var(--border)'
  },
  lightboxName: { color: 'var(--text)', fontSize: 15, fontWeight: 500 },
  lightboxMeta: { color: 'var(--text-muted)', fontSize: 13, marginTop: 4 },
  lightboxActions: { display: 'flex', gap: 8, flexWrap: 'wrap' }
}
