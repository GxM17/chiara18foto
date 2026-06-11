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
  const metadata = {
    name: finalName,
    parents: [folderId],
    description: JSON.stringify({ guestName, uploadedAt: new Date().toISOString(), originalName: file.name })
  }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)
  // supportsAllDrives=true is required when uploading to a folder shared with a service account
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name&supportsAllDrives=true',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  )
  const result = await res.json()
  if (!res.ok) throw new Error(result.error?.message || `Errore upload (${res.status})`)
  return result
}

// ── SVG Decorations ──────────────────────────────────────────────
const Petal = ({ cx, cy, r = 10, angle = 0, color = '#E8A0B4', opacity = 0.7 }) => (
  <ellipse cx={cx} cy={cy} rx={r * 0.6} ry={r} fill={color} opacity={opacity}
    transform={`rotate(${angle}, ${cx}, ${cy})`} />
)

const FloralLeft = () => (
  <svg width="160" height="480" viewBox="0 0 160 480" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', userSelect: 'none' }}>
    {/* Main stem */}
    <path d="M55 460 C45 380 85 320 65 240 C50 175 80 110 60 40" stroke="#C4748A" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    {/* Top flower */}
    <g opacity="0.85">
      <Petal cx={60} cy={40} r={18} angle={0} color="#E8A0B4"/>
      <Petal cx={60} cy={40} r={18} angle={45} color="#DDA0B2"/>
      <Petal cx={60} cy={40} r={18} angle={90} color="#E8A0B4"/>
      <Petal cx={60} cy={40} r={18} angle={135} color="#DDA0B2"/>
      <circle cx={60} cy={40} r={7} fill="#FDF0F4" stroke="#C4748A" strokeWidth={1}/>
    </g>
    {/* Mid flower */}
    <g opacity="0.75">
      <Petal cx={65} cy={175} r={14} angle={20} color="#E8A0B4"/>
      <Petal cx={65} cy={175} r={14} angle={65} color="#C4748A"/>
      <Petal cx={65} cy={175} r={14} angle={110} color="#E8A0B4"/>
      <Petal cx={65} cy={175} r={14} angle={155} color="#C4748A"/>
      <circle cx={65} cy={175} r={5} fill="#FDF0F4" stroke="#C4748A" strokeWidth={1}/>
    </g>
    {/* Side branches */}
    <path d="M60 120 C30 105 15 80 25 55" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    <path d="M62 260 C25 255 10 235 18 210" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    <path d="M58 340 C20 330 8 310 15 288" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    {/* Small flowers on branches */}
    <g opacity="0.65"><Petal cx={24} cy={55} r={9} angle={10} color="#F2B8CA"/><Petal cx={24} cy={55} r={9} angle={80} color="#E8A0B4"/><circle cx={24} cy={55} r={3.5} fill="#FDF0F4"/></g>
    <g opacity="0.6"><Petal cx={17} cy={210} r={8} angle={30} color="#E8A0B4"/><Petal cx={17} cy={210} r={8} angle={100} color="#DDA0B2"/><circle cx={17} cy={210} r={3} fill="#FDF0F4"/></g>
    <g opacity="0.6"><Petal cx={14} cy={288} r={7} angle={15} color="#F2B8CA"/><Petal cx={14} cy={288} r={7} angle={85} color="#E8A0B4"/><circle cx={14} cy={288} r={3} fill="#FDF0F4"/></g>
    {/* Small buds */}
    <ellipse cx={40} cy={90} rx={4} ry={7} fill="#E8A0B4" opacity={0.5} transform="rotate(-20,40,90)"/>
    <ellipse cx={35} cy={300} rx={3} ry={6} fill="#C4748A" opacity={0.4} transform="rotate(15,35,300)"/>
    <circle cx={48} cy={200} r={3} fill="#E8A0B4" opacity={0.35}/>
    <circle cx={30} cy={380} r={2.5} fill="#C4748A" opacity={0.3}/>
  </svg>
)

const FloralRight = () => (
  <svg width="180" height="540" viewBox="0 0 180 540" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: 'absolute', right: 0, top: '45%', transform: 'translateY(-50%)', pointerEvents: 'none', userSelect: 'none' }}>
    {/* Main stem */}
    <path d="M120 520 C135 430 95 360 120 280 C140 215 110 140 130 55" stroke="#C4748A" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    {/* Top large flower */}
    <g opacity="0.9">
      <Petal cx={130} cy={55} r={22} angle={0} color="#F2B8CA"/>
      <Petal cx={130} cy={55} r={22} angle={36} color="#E8A0B4"/>
      <Petal cx={130} cy={55} r={22} angle={72} color="#DDA0B2"/>
      <Petal cx={130} cy={55} r={22} angle={108} color="#E8A0B4"/>
      <Petal cx={130} cy={55} r={22} angle={144} color="#F2B8CA"/>
      <circle cx={130} cy={55} r={8} fill="#FDF0F4" stroke="#C4748A" strokeWidth={1.2}/>
    </g>
    {/* Mid flower */}
    <g opacity="0.78">
      <Petal cx={118} cy={200} r={16} angle={15} color="#E8A0B4"/>
      <Petal cx={118} cy={200} r={16} angle={60} color="#C4748A"/>
      <Petal cx={118} cy={200} r={16} angle={105} color="#E8A0B4"/>
      <Petal cx={118} cy={200} r={16} angle={150} color="#DDA0B2"/>
      <circle cx={118} cy={200} r={6} fill="#FDF0F4" stroke="#C4748A" strokeWidth={1}/>
    </g>
    {/* Lower flower */}
    <g opacity="0.65">
      <Petal cx={122} cy={370} r={13} angle={5} color="#F2B8CA"/>
      <Petal cx={122} cy={370} r={13} angle={65} color="#E8A0B4"/>
      <Petal cx={122} cy={370} r={13} angle={125} color="#DDA0B2"/>
      <circle cx={122} cy={370} r={5} fill="#FDF0F4"/>
    </g>
    {/* Side branches */}
    <path d="M128 130 C160 118 172 95 165 72" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    <path d="M120 300 C158 290 170 268 162 245" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    <path d="M125 440 C162 430 172 412 166 390" stroke="#C4748A" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
    {/* Branch flowers */}
    <g opacity="0.65"><Petal cx={165} cy={72} r={10} angle={25} color="#F2B8CA"/><Petal cx={165} cy={72} r={10} angle={95} color="#E8A0B4"/><circle cx={165} cy={72} r={4} fill="#FDF0F4"/></g>
    <g opacity="0.6"><Petal cx={162} cy={245} r={9} angle={10} color="#E8A0B4"/><Petal cx={162} cy={245} r={9} angle={80} color="#DDA0B2"/><circle cx={162} cy={245} r={3.5} fill="#FDF0F4"/></g>
    <g opacity="0.55"><Petal cx={166} cy={390} r={8} angle={20} color="#F2B8CA"/><Petal cx={166} cy={390} r={8} angle={90} color="#E8A0B4"/><circle cx={166} cy={390} r={3} fill="#FDF0F4"/></g>
    {/* Dots */}
    <circle cx={142} cy={160} r={3.5} fill="#E8A0B4" opacity={0.4}/>
    <circle cx={135} cy={460} r={3} fill="#C4748A" opacity={0.3}/>
    <ellipse cx={155} cy={325} rx={3} ry={5} fill="#E8A0B4" opacity={0.4} transform="rotate(-10,155,325)"/>
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

  useEffect(() => { fetchServiceToken().catch(err => setSystemError(err.message)) }, [])

  const addFiles = useCallback((newFiles) => {
    const valid = []
    for (const f of Array.from(newFiles)) {
      if (!f.type.startsWith('image/') && !f.name.match(/\.(heic|heif|jpg|jpeg|png|gif|webp)$/i)) {
        addToast(`${f.name}: formato non supportato`, 'error'); continue
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { addToast(`${f.name}: max ${MAX_SIZE_MB}MB`, 'error'); continue }
      valid.push(f)
    }
    if (!valid.length) return
    setFiles(p => [...p, ...valid])
    valid.forEach(f => { const r = new FileReader(); r.onload = e => setPreviews(p => [...p, { url: e.target.result, name: f.name }]); r.readAsDataURL(f) })
  }, [addToast])

  const removeFile = idx => { setFiles(p => p.filter((_, i) => i !== idx)); setPreviews(p => p.filter((_, i) => i !== idx)) }
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
        catch { const { token: t2, folderId: f2 } = await fetchServiceToken(); await uploadFile(t2, f2, files[i], name.trim()) }
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setUploaded(true)
    } catch (err) {
      addToast('Errore: ' + (err.message || 'Riprova'), 'error')
      setUploading(false)
    }
  }

  // ── SUCCESS ────────────────────────────────────────────────────
  if (uploaded) return (
    <div style={s.pageCenter}>
      <FloralLeft /><FloralRight />
      <div style={{ textAlign: 'center', maxWidth: 460, position: 'relative', zIndex: 1 }} className="fade-up">
        <div style={{ fontSize: 80, marginBottom: 24, display: 'inline-block', animation: 'float 3s ease-in-out infinite' }}>🌸</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 400, color: 'var(--text)', marginBottom: 16, lineHeight: 1.1 }}>Grazie mille!</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1.8, marginBottom: 36 }}>
          Le tue {files.length} foto sono state caricate con successo.<br/>
          Chiara le riceverà insieme a tutti i ricordi<br/>di questa serata speciale. ♡
        </p>
        <button className="btn btn-rose" style={{ padding: '14px 36px' }} onClick={reset}>Carica altre foto</button>
      </div>
    </div>
  )

  // ── MAIN ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <FloralLeft /><FloralRight />

      {/* Left: form */}
      <div style={s.left} className="fade-up">
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rose)', fontWeight: 600, marginBottom: 12 }}>✦ Benvenuto ✦</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 6vw, 82px)', fontWeight: 400, color: 'var(--text)', lineHeight: 1, marginBottom: 8 }}>Chiara</h1>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 3vw, 38px)', fontStyle: 'italic', color: 'var(--rose)', fontWeight: 300, marginBottom: 20 }}>18 anni</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.75, maxWidth: 360 }}>
            Condividi i tuoi ricordi più belli e aiutaci a rendere questo giorno indimenticabile. ♡
          </p>
        </div>

        {systemError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#991B1B' }}>
            ⚠️ {systemError}
          </div>
        )}

        {/* Nome */}
        <div style={{ marginBottom: 32 }}>
          <label style={s.label}>Il tuo nome</label>
          <input className="input" type="text" placeholder="Scrivi qui il tuo nome" value={name}
            onChange={e => setName(e.target.value)} maxLength={50} disabled={uploading} />
        </div>

        {/* Foto */}
        <div style={{ marginBottom: 32 }}>
          <label style={s.label}>
            Le tue foto
            {files.length > 0 && <span style={{ color: 'var(--rose)', marginLeft: 8, fontWeight: 600 }}>{files.length} selezionate</span>}
          </label>
          <div
            style={{ ...s.drop, ...(dragOver ? s.dropActive : {}), ...(files.length ? { padding: 12, minHeight: 'auto' } : {}) }}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} disabled={uploading} />
            {!files.length ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="20" height="15" rx="2.5" stroke="#C4748A" strokeWidth="1.5"/>
                    <circle cx="12" cy="13.5" r="3.5" stroke="#C4748A" strokeWidth="1.5"/>
                    <path d="M8 6l1.5-2.5h5L16 6" stroke="#C4748A" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="18" cy="9" r="1.2" fill="#C4748A"/>
                  </svg>
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Trascina le tue foto qui</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>oppure <span style={{ color: 'var(--rose)', textDecoration: 'underline' }}>clicca per selezionarle</span></p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>JPG · PNG · HEIC · illimitate</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 8, width: '100%' }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#F5F0EE', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!uploading && (
                      <button style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(44,36,36,0.65)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                        onClick={e => { e.stopPropagation(); removeFile(i) }}>✕</button>
                    )}
                  </div>
                ))}
                {!uploading && (
                  <div style={{ borderRadius: 8, border: '1.5px dashed var(--border)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--rose)', cursor: 'pointer', gap: 2, background: 'var(--rose-pale)', opacity: 0.8 }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{statusMsg}</span>
              <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--rose-pale)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--rose-light), var(--rose))', borderRadius: 2, transition: 'width 0.4s ease', width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Button */}
        <button className="btn btn-rose"
          style={{ padding: '15px 44px', fontSize: 12, letterSpacing: '0.12em', boxShadow: '0 6px 20px rgba(196,116,138,0.3)' }}
          onClick={handleUpload} disabled={uploading || !name.trim() || !files.length}>
          {uploading
            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />&nbsp;{statusMsg}</>
            : `Carica le tue foto${files.length > 0 ? ` (${files.length})` : ''}`}
        </button>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Caricando le foto, accetti di condividerle con Chiara e gli altri ospiti.
        </p>
      </div>

      {/* Right: decorative panel */}
      <div style={s.right}>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 40 }}>
          <div style={{ width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: '1.5px solid rgba(196,116,138,0.2)', boxShadow: '0 12px 40px rgba(196,116,138,0.12)' }}>
            <span style={{ fontSize: 80 }}>🌸</span>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', color: '#A05570', fontWeight: 300, marginBottom: 8 }}>un giorno da ricordare</p>
          <div style={{ width: 40, height: 1, background: 'var(--rose-light)', margin: '16px auto' }} />
          <p style={{ fontSize: 13, color: '#C4748A', letterSpacing: '0.08em', opacity: 0.8 }}>con amore ♡</p>
        </div>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '15%', right: '12%', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(196,116,138,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(196,116,138,0.12)' }} />
        <div style={{ position: 'absolute', top: '55%', right: '8%', width: 50, height: 50, borderRadius: '50%', background: 'rgba(196,116,138,0.07)' }} />
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', background: 'var(--bg)',
    position: 'relative', overflow: 'hidden',
    '@media(maxWidth:768px)': { flexDirection: 'column' }
  },
  pageCenter: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24, background: 'var(--bg)',
    position: 'relative', overflow: 'hidden'
  },
  left: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: 'clamp(40px, 6vw, 80px) clamp(40px, 6vw, 80px) clamp(40px, 6vw, 80px) clamp(60px, 8vw, 120px)',
    maxWidth: 580, position: 'relative', zIndex: 1
  },
  right: {
    flex: '0 0 42%', background: 'linear-gradient(145deg, #FDF0F4 0%, #F8E4EC 50%, #FDF0F4 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', minHeight: 400
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-dim)', marginBottom: 10
  },
  drop: {
    border: '1.5px dashed var(--border)', borderRadius: 16,
    padding: '28px 20px', cursor: 'pointer',
    transition: 'all 0.3s', background: 'white',
    minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  dropActive: { borderColor: 'var(--rose)', background: 'rgba(196,116,138,0.04)' }
}
