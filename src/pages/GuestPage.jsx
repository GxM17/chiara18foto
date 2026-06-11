import React, { useState, useRef, useCallback } from 'react'
import { useToast } from '../utils/ToastContext.jsx'

const MAX_SIZE_MB = 20

// ── SVG decorations ──────────────────────────────────────────────────────────
const FloralLeft = () => (
  <svg width="180" height="420" viewBox="0 0 180 420" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none' }}>
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
  <svg width="200" height="500" viewBox="0 0 200 500" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', right: 0, top: '40%', transform: 'translateY(-50%)', opacity: 0.55, pointerEvents: 'none' }}>
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
    <path d="M135 380 Q180 365 192 340" stroke="#C4748A" strokeWidth="1" fill="none"/>
    <circle cx="168" cy="118" r="3.5" fill="#C4748A" opacity="0.4"/>
    <circle cx="178" cy="255" r="2.5" fill="#E8A0B4" opacity="0.5"/>
    <circle cx="160" cy="350" r="3" fill="#C4748A" opacity="0.3"/>
    <circle cx="110" cy="140" r="2" fill="#E8A0B4" opacity="0.4"/>
    <circle cx="150" cy="420" r="2" fill="#C4748A" opacity="0.3"/>
  </svg>
)

// Proper camera SVG icon (clean, no broken emoji fallback)
const CameraIcon = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="16" width="44" height="30" rx="5" stroke="#C4748A" strokeWidth="1.8" fill="none"/>
    <circle cx="26" cy="31" r="8" stroke="#C4748A" strokeWidth="1.8" fill="none"/>
    <circle cx="26" cy="31" r="3.5" fill="#F5E6EC"/>
    <path d="M18 16l3.5-6h9l3.5 6" stroke="#C4748A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="40" cy="23" r="2" fill="#C4748A"/>
    <path d="M10 24 Q26 20 42 24" stroke="#E8A0B4" strokeWidth="0.9" fill="none" opacity="0.6"/>
  </svg>
)

// Upload cloud icon for the button
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 16.7A4 4 0 0017 9h-1.26A8 8 0 104 16.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// X close icon
const CloseIcon = () => (
  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1l8 8M9 1l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// Add more icon
const AddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke="#C4748A" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

// Lock icon
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
  const fileRef = useRef()
  const { addToast } = useToast()

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

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const reset = () => {
    setFiles([]); setPreviews([]); setUploaded(false)
    setProgress(0); setStatusMsg(''); setUploading(false)
  }

  const handleUpload = async () => {
    if (!name.trim() || !files.length || uploading) return
    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setStatusMsg(`Caricamento foto ${i + 1} di ${files.length}...`)

        const formData = new FormData()
        formData.append('guestName', name.trim())
        formData.append('fileName', file.name)
        formData.append('file', file)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Errore upload foto ${i + 1}`)

        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setUploaded(true)
      addToast(`${files.length} foto caricate con successo! 🌸`, 'success')
    } catch (err) {
      addToast('Errore: ' + (err.message || 'Riprova'), 'error')
      setUploading(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
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

  // ── Main page ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <FloralLeft /><FloralRight />

      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(40px, 6vw, 80px) clamp(40px, 6vw, 100px)', maxWidth: 580, position: 'relative', zIndex: 1 }} className="fade-up">

        {/* Title */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(56px, 7vw, 88px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>Chiara</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.5vw, 42px)', fontStyle: 'italic', color: 'var(--rose)', fontWeight: 300 }}>18 anni</p>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1.7, marginTop: 16, marginBottom: 48, maxWidth: 380 }}>
          Condividi i tuoi ricordi più belli e<br/>aiutaci a rendere questo giorno indimenticabile. ♡
        </p>

        {/* Name field */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
            Il tuo nome
          </label>
          <input
            className="input"
            type="text"
            placeholder="Scrivi qui il tuo nome"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            disabled={uploading}
          />
        </div>

        {/* Photo drop zone */}
        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Le tue foto</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>max {MAX_SIZE_MB}MB · JPG PNG WEBP HEIC</span>
          </label>
          <div
            style={{
              border: `1.5px dashed ${dragOver ? 'var(--rose)' : 'var(--border)'}`,
              borderRadius: 16,
              padding: files.length ? 12 : '32px 20px',
              cursor: uploading ? 'default' : 'pointer',
              transition: 'all 0.3s',
              background: dragOver ? 'rgba(196,116,138,0.04)' : 'white',
              minHeight: files.length ? 'auto' : 160,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (!uploading) addFiles(e.dataTransfer.files) }}
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
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <CameraIcon />
                <div>
                  <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Trascina e rilascia le tue foto qui</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>oppure clicca per selezionarle</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, width: '100%' }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#F5F5F5' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!uploading && (
                      <button
                        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(44,36,36,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={e => { e.stopPropagation(); removeFile(i) }}
                        title="Rimuovi"
                      >
                        <CloseIcon />
                      </button>
                    )}
                  </div>
                ))}
                {!uploading && (
                  <div
                    style={{ borderRadius: 8, border: '1.5px dashed var(--border)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', gap: 2 }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                    title="Aggiungi foto"
                  >
                    <AddIcon />
                    <span style={{ fontSize: 10, letterSpacing: '0.04em' }}>Aggiungi</span>
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              {statusMsg}{progress > 0 ? ` — ${progress}%` : ''}
            </p>
          </div>
        )}

        {/* CTA button */}
        <button
          className="btn btn-rose"
          style={{ alignSelf: 'flex-start', padding: '14px 40px', fontSize: 13 }}
          onClick={handleUpload}
          disabled={uploading || !name.trim() || !files.length}
        >
          {uploading
            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />{statusMsg || 'Caricamento...'}</>
            : <><UploadIcon />Carica {files.length > 0 ? `${files.length} foto` : 'le tue foto'}</>}
        </button>

        {/* Privacy note */}
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <LockIcon />Le foto saranno visibili solo a Chiara e all'amministratore
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
