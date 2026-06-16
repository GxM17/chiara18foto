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
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [lightbox, setLightbox] = useState(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [filterGuest, setFilterGuest] = useState('all')
  const [guestList, setGuestList] = useState([])

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/photos', { headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore caricamento')
      const data = await res.json()
      setPhotos(data.photos || [])
      setGuestList([...new Set((data.photos || []).map(p => p.guestName).filter(Boolean))])
    } catch (err) { addToast(err.message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPhotos() }, [])

  const filtered = filterGuest === 'all' ? photos : photos.filter(p => p.guestName === filterGuest)
  const toggleSelect = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(filtered.map(p => p.id)))
  const clearSel = () => setSelected(new Set())

  const downloadPhoto = async photo => {
    try {
      const res = await fetch(`/api/download/${photo.id}`, { headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = photo.originalName || photo.name; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { addToast('Errore: ' + err.message, 'error') }
  }

  const downloadSelected = async () => {
    const toDownload = selected.size > 0 ? photos.filter(p => selected.has(p.id)) : filtered
    if (!toDownload.length) { addToast('Nessuna foto', 'info'); return }
    setDownloadingAll(true)
    addToast(`Download ${toDownload.length} foto...`, 'info')
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
      addToast(`${toDownload.length} foto scaricate! 🌸`, 'success')
    } catch (err) { addToast('Errore: ' + err.message, 'error') }
    finally { setDownloadingAll(false) }
  }

  const deletePhoto = async photo => {
    if (!confirm('Eliminare questa foto?')) return
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE', headers: { 'X-Admin-Key': ADMIN_KEY } })
      if (!res.ok) throw new Error('Errore')
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setLightbox(null)
      addToast('Foto eliminata', 'success')
    } catch (err) { addToast('Errore: ' + err.message, 'error') }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <header style={{ background:'white', borderBottom:'1px solid var(--border)', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 12px rgba(196,116,138,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24 }}>🌸</span>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:400, color:'var(--text)' }}>Dashboard Admin</h1>
            <p style={{ color:'var(--text-muted)', fontSize:12 }}>I 18 anni di Chiara · Raccolta foto</p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => { logoutAdmin(); navigate('/admin', { replace: true }) }} style={{ fontSize:13 }}>Esci</button>
      </header>

      <div style={{ padding:'28px 32px', flex:1 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:28 }}>
          {[['Foto totali', photos.length, '📷'], ['Ospiti', guestList.length, '👥'], ['Selezionate', selected.size, '✓']].map(([label, num, icon]) => (
            <div key={label} style={{ background:'white', borderRadius:16, padding:'20px 24px', border:'1px solid var(--border)', boxShadow:'0 2px 8px rgba(196,116,138,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</span>
              </div>
              <p style={{ fontFamily:'var(--font-display)', fontSize:40, fontWeight:400, color:'var(--rose)', lineHeight:1 }}>{num}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <select style={{ padding:'8px 14px', background:'white', border:'1.5px solid var(--border)', borderRadius:100, color:'var(--text)', fontFamily:'var(--font-body)', fontSize:13, cursor:'pointer', outline:'none' }} value={filterGuest} onChange={e => setFilterGuest(e.target.value)}>
              <option value="all">Tutti gli ospiti</option>
              {guestList.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={fetchPhotos} disabled={loading} style={{ fontSize:12, borderRadius:100 }}>{loading ? '↻ Aggiornamento...' : '↻ Aggiorna'}</button>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {selected.size > 0 && <button className="btn btn-ghost" onClick={clearSel} style={{ fontSize:12, borderRadius:100 }}>✕ Deseleziona</button>}
            <button className="btn btn-ghost" onClick={selectAll} style={{ fontSize:12, borderRadius:100 }}>Seleziona tutte</button>
            <button className="btn btn-rose" onClick={downloadSelected} disabled={downloadingAll} style={{ fontSize:12 }}>
              {downloadingAll ? <><span className="spinner" style={{ width:13, height:13, borderWidth:2, borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)' }} />Download...</> : `⬇ ${selected.size > 0 ? `Scarica (${selected.size})` : 'Scarica tutte'}`}
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'80px 0', gap:16 }}>
            <div className="spinner" style={{ width:36, height:36, borderWidth:3 }} />
            <p style={{ color:'var(--text-muted)' }}>Caricamento foto...</p>
          </div>
        ) : !filtered.length ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <p style={{ fontSize:48, marginBottom:12 }}>🌸</p>
            <p style={{ color:'var(--text-muted)', fontSize:15 }}>{photos.length === 0 ? 'Nessuna foto ancora caricata.' : 'Nessuna foto per questo ospite.'}</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
            {filtered.map(photo => (
              <div key={photo.id} onClick={() => setLightbox(photo)}
                style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'1', cursor:'pointer', border: selected.has(photo.id) ? '2.5px solid var(--rose)' : '2px solid transparent', transition:'all 0.2s', boxShadow: selected.has(photo.id) ? '0 0 0 3px rgba(196,116,138,0.2)' : '0 2px 8px rgba(0,0,0,0.08)' }}>
                {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : <div style={{ width:'100%', height:'100%', background:'var(--rose-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>📷</div>}
                <button onClick={e => { e.stopPropagation(); toggleSelect(photo.id) }}
                  style={{ position:'absolute', top:8, right:8, width:24, height:24, borderRadius:'50%', border:`2px solid ${selected.has(photo.id) ? 'var(--rose)' : 'rgba(255,255,255,0.8)'}`, background: selected.has(photo.id) ? 'var(--rose)' : 'rgba(255,255,255,0.5)', cursor:'pointer', color: selected.has(photo.id) ? 'white' : 'transparent', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, transition:'all 0.2s' }}>
                  {selected.has(photo.id) ? '✓' : ''}
                </button>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'20px 10px 8px', background:'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                  <span style={{ color:'white', fontSize:11, fontWeight:500 }}>👤 {photo.guestName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, background:'rgba(44,36,36,0.85)', backdropFilter:'blur(12px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn 0.2s ease' }} onClick={() => setLightbox(null)}>
          <div style={{ background:'white', borderRadius:20, overflow:'hidden', maxWidth:860, width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            {lightbox.url ? <img src={lightbox.url} alt="" style={{ width:'100%', maxHeight:'65vh', objectFit:'contain', background:'#F5F5F5' }} /> : <div style={{ height:300, background:'var(--rose-pale)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>📷</div>}
            <div style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, borderTop:'1px solid var(--border)' }}>
              <div>
                <p style={{ color:'var(--text)', fontSize:14, fontWeight:500 }}>{lightbox.originalName || lightbox.name}</p>
                <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:3 }}>👤 {lightbox.guestName} · {lightbox.uploadedAt ? new Date(lightbox.uploadedAt).toLocaleDateString('it-IT') : ''}</p>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-rose" style={{ fontSize:12 }} onClick={() => downloadPhoto(lightbox)}>⬇ Scarica</button>
                <button className="btn btn-ghost" style={{ fontSize:12, color:'#DC2626' }} onClick={() => deletePhoto(lightbox)}>🗑 Elimina</button>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => setLightbox(null)}>✕ Chiudi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
