import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext.jsx'
import { useToast } from '../utils/ToastContext.jsx'

const ADMIN_KEY = 'Chiara18!Admin'

export default function AdminDashboard() {
  const { logoutAdmin } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [lightbox, setLightbox] = useState(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [filterGuest, setFilterGuest] = useState('all')
  const [guestList, setGuestList] = useState([])

  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true)
    try {
      const res = await fetch('/api/photos', { headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore caricamento foto')
      const data = await res.json()
      setPhotos(data.photos || [])
      const guests = [...new Set((data.photos || []).map(p => p.guestName).filter(Boolean))]
      setGuestList(guests)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoadingPhotos(false)
    }
  }, [])

  useEffect(() => { fetchPhotos() }, [])

  const filteredPhotos = filterGuest === 'all' ? photos : photos.filter(p => p.guestName === filterGuest)
  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(filteredPhotos.map(p => p.id)))
  const clearSelection = () => setSelected(new Set())

  const downloadPhoto = async photo => {
    try {
      const res = await fetch(`/api/download/${photo.id}`, { headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = photo.originalName || photo.name; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { addToast('Errore download: ' + err.message, 'error') }
  }

  const downloadSelected = async () => {
    const toDownload = selected.size > 0 ? photos.filter(p => selected.has(p.id)) : filteredPhotos
    if (!toDownload.length) { addToast('Nessuna foto da scaricare', 'info'); return }
    setDownloadingAll(true)
    addToast(`Download di ${toDownload.length} foto in corso...`, 'info')
    try {
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        body: JSON.stringify({ fileIds: toDownload.map(p => p.id) })
      })
      if (!res.ok) throw new Error('Errore ZIP')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `foto_chiara18_${new Date().toISOString().slice(0,10)}.zip`; a.click()
      URL.revokeObjectURL(url)
      addToast(`${toDownload.length} foto scaricate!`, 'success')
    } catch (err) { addToast('Errore: ' + err.message, 'error') }
    finally { setDownloadingAll(false) }
  }

  const deletePhoto = async photo => {
    if (!confirm(`Eliminare "${photo.originalName || photo.name}"?`)) return
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE', headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore eliminazione')
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setSelected(prev => { const n = new Set(prev); n.delete(photo.id); return n })
      setLightbox(null)
      addToast('Foto eliminata', 'success')
    } catch (err) { addToast('Errore: ' + err.message, 'error') }
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title} className="shimmer-text">Dashboard Admin</h1>
          <p style={s.sub}>I 18 anni di Chiara · Raccolta foto</p>
        </div>
        <button className="btn btn-ghost" onClick={() => { logoutAdmin(); navigate('/admin', { replace: true }) }} style={{ fontSize: 13 }}>Esci</button>
      </header>

      <div style={s.content}>
        <div style={s.statsRow}>
          {[['Foto totali', photos.length], ['Ospiti', guestList.length], ['Selezionate', selected.size]].map(([label, num]) => (
            <div key={label} style={s.stat} className="card">
              <span style={s.statNum}>{num}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        <div style={s.toolbar}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select style={s.select} value={filterGuest} onChange={e => setFilterGuest(e.target.value)}>
              <option value="all">Tutti gli ospiti</option>
              {guestList.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={fetchPhotos} style={{ fontSize: 13 }} disabled={loadingPhotos}>
              {loadingPhotos ? '↻ Aggiornamento...' : '↻ Aggiorna'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected.size > 0 && <button className="btn btn-ghost" onClick={clearSelection} style={{ fontSize: 13 }}>✕ Deseleziona</button>}
            <button className="btn btn-ghost" onClick={selectAll} style={{ fontSize: 13 }}>Seleziona tutte</button>
            <button className="btn btn-gold" onClick={downloadSelected} disabled={downloadingAll} style={{ fontSize: 13 }}>
              {downloadingAll ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Download...</> : <>⬇ {selected.size > 0 ? `Scarica (${selected.size})` : 'Scarica tutte'}</>}
            </button>
          </div>
        </div>

        {loadingPhotos ? (
          <div style={s.center}><div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} /><p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Caricamento foto...</p></div>
        ) : !filteredPhotos.length ? (
          <div style={s.center}><p style={{ fontSize: 48 }}>📷</p><p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{photos.length === 0 ? 'Nessuna foto ancora caricata.' : 'Nessuna foto per questo ospite.'}</p></div>
        ) : (
          <div style={s.grid}>
            {filteredPhotos.map(photo => (
              <div key={photo.id} style={{ ...s.photoCard, ...(selected.has(photo.id) ? s.photoSelected : {}) }} onClick={() => setLightbox(photo)}>
                {photo.thumbnailUrl
                  ? <img src={photo.thumbnailUrl} alt={photo.name} style={s.photoImg} loading="lazy" />
                  : <div style={s.photoPlaceholder}>📷</div>}
                <button style={{ ...s.check, ...(selected.has(photo.id) ? s.checkActive : {}) }}
                  onClick={e => { e.stopPropagation(); toggleSelect(photo.id) }}>
                  {selected.has(photo.id) ? '✓' : ''}
                </button>
                <div style={s.photometa}><span style={{ color: '#fff', fontSize: 12 }}>👤 {photo.guestName}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div style={s.lbBg} onClick={() => setLightbox(null)}>
          <div style={s.lbBox} onClick={e => e.stopPropagation()}>
            {lightbox.url
              ? <img src={lightbox.url} alt={lightbox.name} style={s.lbImg} />
              : <div style={{ ...s.lbImg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📷</div>}
            <div style={s.lbInfo}>
              <div>
                <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 500 }}>{lightbox.originalName || lightbox.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>👤 {lightbox.guestName} · {lightbox.uploadedAt ? new Date(lightbox.uploadedAt).toLocaleDateString('it-IT') : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-gold" onClick={() => downloadPhoto(lightbox)}>⬇ Scarica</button>
                <button className="btn btn-ghost" onClick={() => deletePhoto(lightbox)} style={{ color: '#fca5a5' }}>🗑 Elimina</button>
                <button className="btn btn-ghost" onClick={() => setLightbox(null)}>✕ Chiudi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(13,6,24,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 },
  title: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300 },
  sub: { color: 'var(--text-muted)', fontSize: 13 },
  content: { padding: '28px 32px', flex: 1 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 },
  stat: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 300, color: 'var(--gold)', lineHeight: 1 },
  statLabel: { color: 'var(--text-muted)', fontSize: 13 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  select: { padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  photoCard: { position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s ease' },
  photoSelected: { border: '2px solid var(--gold)', boxShadow: '0 0 0 2px rgba(201,168,76,0.3)' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: 'rgba(255,255,255,0.05)' },
  check: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.4)', cursor: 'pointer', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: 'all 0.2s' },
  checkActive: { background: 'var(--gold)', border: '2px solid var(--gold)', color: '#000' },
  photometa: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' },
  lbBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease' },
  lbBox: { background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', maxWidth: 900, width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  lbImg: { width: '100%', maxHeight: '65vh', objectFit: 'contain', background: '#000' },
  lbInfo: { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)' }
}
