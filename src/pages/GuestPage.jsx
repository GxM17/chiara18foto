import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '../utils/ToastContext.jsx'

const MAX_SIZE_MB = 20
let cachedToken = null, cachedFolderId = null, tokenExpiry = 0

async function fetchServiceToken() {
  const res = await fetch('/api/service-token')
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error || 'Errore server')
  cachedToken = data.access_token
  cachedFolderId = data.folder_id
  tokenExpiry = Date.now() + 3500 * 1000
  return { token: cachedToken, folderId: cachedFolderId }
}

async function getTokenAndFolder() {
  if (cachedToken && cachedFolderId && Date.now() < tokenExpiry) return { token: cachedToken, folderId: cachedFolderId }
  return fetchServiceToken()
}

async function uploadFile(token, folderId, file, guestName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const safeGuest = guestName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_') || 'Ospite'
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const finalName = `${safeGuest}_${timestamp}.${ext}`
  const metadata = { name: finalName, parents: [folderId], description: JSON.stringify({ guestName, uploadedAt: new Date().toISOString(), originalName: file.name }) }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error?.message || `Errore upload (${res.status})`)
  return result
}

// Floral SVG decorations
const FloralLeft = () => (
  <svg width="180" height="420" viewBox="0 0 180 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none' }}>
    <path d="M60 380 Q40 300 80 240 Q100 200 70 140 Q50 90 90 40" stroke="#C4748A" strokeWidth="1.5" fill="none"/>
    <ellipse cx="90" cy="40" rx="22" ry="28" fill="none" stroke="#C4748A" strokeWidth="1.2"/>
    <ellipse cx="68" cy="55" rx="16" ry="20" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <ellipse cx="112" cy="55" rx="16" ry="20" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <circle cx="90" cy="42" r="6" fill="#F5E6EC"/>
    <ellipse cx="70" cy="140" rx="18" ry="24" fill="none" stroke="#C4748A" strokeWidth="1.2"/>
    <ellipse cx="50" cy="158" rx="12" ry="16" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <ellipse cx="92" cy="155" rx="12" ry="16" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <circle cx="70" cy="142" r="5" fill="#F5E6EC"/>
    <path d="M75 200 Q30 190 20 160" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <path d="M72 220 Q50 240 60 270" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <path d="M65 280 Q30 275 15 260" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <ellipse cx="20" cy="158" rx="10" ry="14" fill="none" stroke="#E8A0B4" strokeWidth="0.8"/>
    <ellipse cx="60" cy="272" rx="10" ry="14" fill="none" stroke="#E8A0B4" strokeWidth="0.8"/>
    <ellipse cx="15" cy="258" rx="8" ry="12" fill="none" stroke="#E8A0B4" strokeWidth="0.8"/>
    <path d="M60 380 Q20 360 10 330" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <circle cx="35" cy="195" r="3" fill="#C4748A" opacity="0.4"/>
    <circle cx="52" cy="245" r="2" fill="#E8A0B4" opacity="0.5"/>
    <circle cx="25" cy="305" r="2.5" fill="#C4748A" opacity="0.3"/>
  </svg>
)

const FloralRight = () => (
  <svg width="200" height="500" viewBox="0 0 200 500" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', right: 0, top: '40%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none' }}>
    <path d="M140 460 Q160 370 120 300 Q100 250 130 180 Q150 120 110 50" stroke="#C4748A" strokeWidth="1.5" fill="none"/>
    <ellipse cx="110" cy="50" rx="26" ry="34" fill="none" stroke="#C4748A" strokeWidth="1.3"/>
    <ellipse cx="84" cy="68" rx="18" ry="24" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <ellipse cx="136" cy="68" rx="18" ry="24" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <circle cx="110" cy="52" r="7" fill="#F5E6EC"/>
    <ellipse cx="130" cy="180" rx="20" ry="26" fill="none" stroke="#C4748A" strokeWidth="1.2"/>
    <ellipse cx="108" cy="196" rx="14" ry="18" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <ellipse cx="152" cy="196" rx="14" ry="18" fill="none" stroke="#E8A0B4" strokeWidth="1"/>
    <circle cx="130" cy="182" r="6" fill="#F5E6EC"/>
    <path d="M125 130 Q170 120 182 90" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <path d="M128 240 Q175 250 185 280" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <path d="M122 310 Q170 305 185 285" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <ellipse cx="182" cy="88" rx="12" ry="16" fill="none" stroke="#E8A0B4" strokeWidth="0.9"/>
    <ellipse cx="185" cy="282" rx="12" ry="16" fill="none" stroke="#E8A0B4" strokeWidth="0.9"/>
    <ellipse cx="186" cy="283" rx="10" ry="13" fill="none" stroke="#E8A0B4" strokeWidth="0.8"/>
    <path d="M135 380 Q180 365 192 340" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <circle cx="168" cy="118" r="3.5" fill="#C4748A" opacity="0.4"/>
    <circle cx="178" cy="255" r="2.5" fill="#E8A0B4" opacity="0.5"/>
    <circle cx="160" cy="350" r="3" fill="#C4748A" opacity="0.3"/>
    <circle cx="110" cy="140" r="2" fill="#E8A0B4" opacity="0.4"/>
    <circle cx="150" cy="420" r="2" fill="#C4748A" opacity="0.3"/>
  </svg>
)

const CameraIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="36" height="26" rx="4" stroke="#C4748A" strokeWidth="1.5" fill="none"/>
    <circle cx="24" cy="27" r="7" stroke="#C4748A" strokeWidth="1.5" fill="none"/>
    <circle cx="24" cy="27" r="3" fill="#F5E6EC"/>
    <path d="M17 14l3-5h8l3 5" stroke="#C4748A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="36" cy="20" r="1.5" fill="#C4748A"/>
    <path d="M10 22 Q24 18 38 22" stroke="#E8A0B4" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <circle cx="24" cy="8" r="2" fill="#E8A0B4" opacity="0.4"/>
  </svg>
)

export default function GuestPage() {
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [systemError, setSystemError] = useState(null)
  const fileRef = useRef()
  const { addToast } = useToast()

  useEffect(() => {
    fetchServiceToken().catch(err => setSystemError(err.message))
  }, [])

  const addFiles = useCallback((newFiles) => {
    const valid = []
    for (const f of Array.from(newFiles)) {
      if (!f.type.startsWith('image/') && !f.name.match(/\.(heic|heif|jpg|jpeg|png|gif|webp)$/i)) {
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

  const reset = () => { setUploaded(false); setFiles([]); setPreviews([]); setName(''); setProgress(0); setStatusMsg('') }

  const handleUpload = async () => {
    if (!name.trim()) { addToast('Inserisci il tuo nome', 'error'); return }
    if (!files.length) { addToast('Seleziona almeno una foto', 'error'); return }
    setUploading(true); setProgress(0); setStatusMsg('Connessione...')
    try {
      const { token, folderId } = await getTokenAndFolder()
      for (let i = 0; i < files.length; i++) {
        setStatusMsg(`Caricamento ${i + 1} di ${files.length}...`)
        try { await uploadFile(token, folderId, files[i], name.trim()) }
        catch { const { token: t2 } = await fetchServiceToken(); await uploadFile(t2, folderId, files[i], name.trim()) }
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setUploaded(true)
      addToast(`${files.length} foto caricate! 🌸`, 'success')
    } catch (err) {
      addToast('Errore: ' + (err.message || 'Riprova'), 'error')
      setUploading(false)
    }
  }

  if (uploaded) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <FloralLeft /><FloralRight />
      <div style={{ textAlign: 'center', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }} className="fade-up">
        <div style={{ fontSize: 72, animation: 'float 3s ease-in-out infinite' }}>🌸</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--text)', lineHeight: 1.1 }}>Grazie mille!</h1>
        <p style={{ color: 'var(--text-dim)', lineHeight: 1.8, fontSize: 16 }}>
          Le tue foto sono state caricate con successo.<br/>
          Chiara le riceverà insieme a tutti i ricordi di questa serata speciale. ♡
        </p>
        <button className="btn btn-rose" onClick={reset}>Carica altre foto</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <FloralLeft /><FloralRight />

      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 60px 60px 100px', maxWidth: 580, position: 'relative', zIndex: 1 }} className="fade-up">
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(56px, 7vw, 88px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>Chiara</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.5vw, 42px)', fontStyle: 'italic', color: 'var(--rose)', fontWeight: 300 }}>18 anni</p>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1.7, marginTop: 16, marginBottom: 48, maxWidth: 380 }}>
          Condividi i tuoi ricordi più belli e<br/>aiutaci a rendere questo giorno indimenticabile. ♡
        </p>

        {systemError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#991B1B' }}>
            ⚠️ {systemError}
          </div>
        )}

        {/* Name field */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>Il tuo nome</label>
          <input className="input" type="text" placeholder="Scrivi qui il tuo nome" value={name} onChange={e => setName(e.target.value)} maxLength={50} disabled={uploading} />
        </div>

        {/* Photo field */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>Le tue foto</label>
          <div
            style={{
              border: `1.5px dashed ${dragOver ? 'var(--rose)' : 'var(--border)'}`,
              borderRadius: 16, padding: files.length ? 12 : '28px 20px',
              cursor: 'pointer', transition: 'all 0.3s',
              background: dragOver ? 'rgba(196,116,138,0.04)' : 'white',
              minHeight: files.length ? 'auto' : 140,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} disabled={uploading} />
            {!files.length ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <CameraIcon />
                <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Trascina e rilascia le tue foto qui</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>oppure clicca per selezionarle</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>JPG, PNG o HEIC – illimitate</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, width: '100%' }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#F5F5F5' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!uploading && (
                      <button style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(44,36,36,0.6)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                        onClick={e => { e.stopPropagation(); removeFile(i) }}>✕</button>
                    )}
                  </div>
                ))}
                {!uploading && (
                  <div style={{ borderRadius: 8, border: '1.5px dashed var(--border)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', gap: 2, fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                    <span style={{ fontSize: 22 }}>+</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 3, background: 'rgba(196,116,138,0.15)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', background: 'var(--rose)', borderRadius: 2, transition: 'width 0.4s ease', width: `${progress}%` }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{statusMsg} {progress > 0 ? `— ${progress}%` : ''}</p>
          </div>
        )}

        {/* Button */}
        <button className="btn btn-rose" style={{ alignSelf: 'flex-start', padding: '14px 40px', fontSize: 12 }} onClick={handleUpload} disabled={uploading || !name.trim() || !files.length}>
          {uploading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />{statusMsg || 'Caricamento...'}</> : 'Carica le tue foto'}
        </button>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          Caricando le foto, accetti di condividerle con Chiara e gli altri ospiti.
        </p>
      </div>

      {/* Right decorative panel */}
      <div style={{ flex: '0 0 42%', background: 'linear-gradient(135deg, #FDF0F4 0%, #FBE8F0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', padding: 40, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(196,116,138,0.2)' }}>
            <span style={{ fontSize: 72 }}>🌸</span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-dim)', fontStyle: 'italic' }}>un giorno da ricordare</p>
        </div>
      </div>
    </div>
  )
}
