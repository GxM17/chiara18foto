import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '../utils/ToastContext.jsx'

const MAX_SIZE_MB = 20
const FOLDER_NAME = 'Chiara18'

// Token cache
let cachedToken = null
let cachedFolderId = null
let tokenExpiry = 0

async function fetchServiceToken() {
  const res = await fetch('/api/service-token')
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || 'Errore configurazione server')
  }
  cachedToken = data.access_token
  cachedFolderId = data.folder_id || null
  tokenExpiry = Date.now() + 3500 * 1000
  return { token: cachedToken, folderId: cachedFolderId }
}

async function getTokenAndFolder() {
  if (cachedToken && cachedFolderId && Date.now() < tokenExpiry) {
    return { token: cachedToken, folderId: cachedFolderId }
  }
  return await fetchServiceToken()
}

async function getOrCreateFolder(token, knownFolderId) {
  if (knownFolderId) return knownFolderId
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  if (data.files && data.files.length > 0) return data.files[0].id

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
  })
  const folder = await createRes.json()
  if (!folder.id) throw new Error('Impossibile creare cartella Drive')
  return folder.id
}

async function uploadFile(token, folderId, file, guestName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const safeGuest = guestName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_') || 'Ospite'
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const finalName = `${safeGuest}_${timestamp}.${ext}`

  const metadata = {
    name: finalName,
    parents: [folderId],
    description: JSON.stringify({
      guestName,
      uploadedAt: new Date().toISOString(),
      originalName: file.name
    })
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  )

  const result = await res.json()
  if (!res.ok) throw new Error(result.error?.message || `Errore upload (${res.status})`)
  return result
}

export default function GuestPage() {
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [systemReady, setSystemReady] = useState(null) // null=checking, true=ok, false=error
  const fileRef = useRef()
  const { addToast } = useToast()

  // Pre-fetch token on mount
  useEffect(() => {
    fetchServiceToken()
      .then(() => setSystemReady(true))
      .catch(err => {
        console.error('System init error:', err)
        setSystemReady(false)
      })
  }, [])

  const addFiles = useCallback((newFiles) => {
    const valid = []
    for (const f of Array.from(newFiles)) {
      if (!f.type.startsWith('image/') && !f.name.match(/\.(heic|heif|jpg|jpeg|png|gif|webp|bmp)$/i)) {
        addToast(`${f.name}: formato non supportato`, 'error'); continue
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        addToast(`${f.name}: max ${MAX_SIZE_MB}MB`, 'error'); continue
      }
      valid.push(f)
    }
    if (!valid.length) return
    setFiles(prev => [...prev, ...valid])
    valid.forEach(f => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, { url: e.target.result, name: f.name }])
      reader.readAsDataURL(f)
    })
  }, [addToast])

  const removeFile = idx => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const reset = () => {
    setUploaded(false); setFiles([]); setPreviews([])
    setName(''); setProgress(0); setStatusMsg('')
  }

  const handleUpload = async () => {
    if (!name.trim()) { addToast('Inserisci il tuo nome', 'error'); return }
    if (!files.length) { addToast('Seleziona almeno una foto', 'error'); return }

    setUploading(true); setProgress(0); setStatusMsg('Connessione...')

    try {
      // Get fresh token and folder
      setStatusMsg('Connessione a Google Drive...')
      const { token, folderId: knownFolder } = await getTokenAndFolder()
      const folderId = await getOrCreateFolder(token, knownFolder)

      let done = 0
      for (const file of files) {
        setStatusMsg(`Caricamento ${done + 1} di ${files.length}: ${file.name}`)
        try {
          await uploadFile(token, folderId, file, name.trim())
        } catch (fileErr) {
          // Try with refreshed token
          const { token: freshToken } = await fetchServiceToken()
          await uploadFile(freshToken, folderId, file, name.trim())
        }
        done++
        setProgress(Math.round((done / files.length) * 100))
      }

      setUploaded(true)
      addToast(`${done} foto caricate! 🎉`, 'success')
    } catch (err) {
      console.error('Upload error:', err)
      addToast('Errore: ' + (err.message || 'Riprova'), 'error')
      setUploading(false)
    }
  }

  // ── SUCCESS SCREEN ──
  if (uploaded) return (
    <div style={s.page}>
      <div style={s.successCard} className="card fade-up">
        <div style={{ fontSize: 72, animation: 'float 3s ease-in-out infinite' }}>🎂</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 300 }} className="shimmer-text">
          Grazie mille!
        </h1>
        <p style={{ color: 'var(--text-dim)', lineHeight: 1.8, fontSize: 15, textAlign: 'center' }}>
          Le tue foto sono state caricate con successo.<br />
          Chiara le riceverà insieme a tutti i ricordi di questa serata speciale.
        </p>
        <button className="btn btn-outline" onClick={reset}>✦ Carica altre foto</button>
      </div>
    </div>
  )

  // ── MAIN FORM ──
  return (
    <div style={s.page}>
      {/* Header */}
      <header style={{ textAlign: 'center', paddingTop: 20 }} className="fade-up">
        <div style={s.badge}>✦ 18 anni ✦</div>
        <h1 style={s.title}><em>Chiara</em></h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, fontWeight: 300 }}>
          Condividi i tuoi ricordi più belli di questa serata
        </p>
      </header>

      {/* System error banner */}
      {systemReady === false && (
        <div style={s.errorBanner}>
          ⚠️ Sistema temporaneamente non disponibile. Ricarica la pagina.
        </div>
      )}

      {/* Form card */}
      <div style={s.card} className="card fade-up">
        {/* Name */}
        <div style={s.field}>
          <label style={s.label}>Il tuo nome</label>
          <input
            className="input"
            type="text"
            placeholder="Come ti chiami?"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            disabled={uploading}
          />
        </div>

        {/* Drop zone */}
        <div style={s.field}>
          <label style={s.label}>
            Le tue foto
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', marginLeft: 6 }}>
              (max {MAX_SIZE_MB}MB ciascuna · JPG PNG WEBP HEIC)
            </span>
          </label>

          <div
            style={{ ...s.drop, ...(dragOver ? s.dropActive : {}), ...(files.length ? s.dropFull : {}) }}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)}
              disabled={uploading}
            />

            {!files.length ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 40 }}>📸</div>
                <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 500 }}>Trascina le foto qui</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>oppure clicca per selezionare</p>
              </div>
            ) : (
              <div style={s.grid}>
                {previews.map((p, i) => (
                  <div key={i} style={s.thumb}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!uploading && (
                      <button style={s.rmBtn} onClick={e => { e.stopPropagation(); removeFile(i) }}>✕</button>
                    )}
                  </div>
                ))}
                {!uploading && (
                  <div style={s.addMore} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                    <span style={{ fontSize: 28 }}>+</span>
                    <span style={{ fontSize: 11 }}>Aggiungi</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={s.bar}><div style={{ ...s.barFill, width: `${progress}%` }} /></div>
            <p style={{ fontSize: 13, color: 'var(--gold)', textAlign: 'center' }}>
              {statusMsg} {progress > 0 ? `— ${progress}%` : ''}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-gold"
          style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, borderRadius: 10 }}
          onClick={handleUpload}
          disabled={uploading || !name.trim() || !files.length}
        >
          {uploading
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />&nbsp;{statusMsg || 'Caricamento...'}</>
            : <>✦ Carica {files.length > 0 ? `${files.length} foto` : 'le foto'}</>
          }
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          🔒 Le foto saranno visibili solo a Chiara e all'amministratore
        </p>
      </div>

      <footer style={{ marginTop: 'auto', paddingTop: 20 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>
          con ❤️ per il tuo giorno speciale
        </p>
      </footer>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px 80px', gap: 32 },
  badge: { display: 'inline-block', padding: '6px 20px', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 100, fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(56px, 12vw, 96px)', fontWeight: 300, color: 'var(--text)', lineHeight: 1, marginBottom: 16 },
  card: { width: '100%', maxWidth: 560, padding: 36, display: 'flex', flexDirection: 'column', gap: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' },
  drop: { border: '2px dashed var(--border)', borderRadius: 12, padding: '32px 16px', cursor: 'pointer', transition: 'all 0.3s ease', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropActive: { borderColor: 'var(--gold)', background: 'rgba(201,168,76,0.05)' },
  dropFull: { padding: 16, minHeight: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, width: '100%' },
  thumb: { position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: 'rgba(255,255,255,0.05)' },
  rmBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  addMore: { borderRadius: 8, border: '2px dashed var(--border)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', gap: 4 },
  bar: { height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, var(--gold), var(--gold-light))', borderRadius: 2, transition: 'width 0.4s ease' },
  successCard: { maxWidth: 480, width: '100%', padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 60 },
  errorBanner: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 10, padding: '12px 20px', fontSize: 14, maxWidth: 560, width: '100%' }
}
