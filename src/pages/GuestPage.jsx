import React, { useState, useRef, useCallback } from 'react'
import { useToast } from '../utils/ToastContext.jsx'

const MAX_FILES = 200
const MAX_SIZE_MB = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

export default function GuestPage() {
  const [name, setName] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef()
  const { addToast } = useToast()

  const validateFiles = (newFiles) => {
    const valid = []
    for (const f of newFiles) {
      if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(heic|heif)$/i)) {
        addToast(`${f.name}: formato non supportato`, 'error')
        continue
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        addToast(`${f.name}: troppo grande (max ${MAX_SIZE_MB}MB)`, 'error')
        continue
      }
      valid.push(f)
    }
    return valid
  }

  const addFiles = useCallback((newFiles) => {
    const valid = validateFiles(Array.from(newFiles))
    const combined = [...files, ...valid].slice(0, MAX_FILES)
    if (combined.length > MAX_FILES) {
      addToast(`Massimo ${MAX_FILES} foto per volta`, 'info')
    }
    setFiles(combined)

    // Generate previews
    const newPreviews = [...previews]
    valid.slice(0, MAX_FILES - files.length).forEach(f => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push({ url: e.target.result, name: f.name })
        setPreviews([...newPreviews])
      }
      reader.readAsDataURL(f)
    })
  }, [files, previews])

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!name.trim()) { addToast('Inserisci il tuo nome', 'error'); return }
    if (files.length === 0) { addToast('Seleziona almeno una foto', 'error'); return }

    setUploading(true)
    setUploadProgress(0)

    try {
      let successCount = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('guestName', name.trim())
        formData.append('fileName', file.name)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Errore upload ${file.name}`)
        }

        successCount++
        setUploadProgress(Math.round((successCount / files.length) * 100))
      }

      setUploaded(true)
      addToast(`${successCount} foto caricate con successo! 🎉`, 'success')
    } catch (err) {
      addToast(err.message || 'Errore durante il caricamento', 'error')
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard} className="card fade-up">
          <div style={styles.successIcon}>🎂</div>
          <h1 style={styles.successTitle} className="shimmer-text">Grazie mille!</h1>
          <p style={styles.successText}>
            Le tue foto sono state caricate con successo.<br />
            Chiara le riceverà insieme a tutti i ricordi di questa serata speciale.
          </p>
          <button
            className="btn btn-outline"
            onClick={() => { setUploaded(false); setFiles([]); setPreviews([]); setName(''); setUploadProgress(0) }}
          >
            ✦ Carica altre foto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header} className="fade-up">
        <div style={styles.badge}>✦ 18 anni ✦</div>
        <h1 style={styles.title}>
          <em>Chiara</em>
        </h1>
        <p style={styles.subtitle}>Condividi i tuoi ricordi più belli di questa serata</p>
      </header>

      {/* Form */}
      <div style={styles.formCard} className="card fade-up">
        {/* Name input */}
        <div style={styles.field}>
          <label style={styles.label}>Il tuo nome</label>
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
        <div style={styles.field}>
          <label style={styles.label}>
            Le tue foto
            <span style={styles.labelHint}> (max {MAX_SIZE_MB}MB ciascuna)</span>
          </label>
          <div
            style={{
              ...styles.dropZone,
              ...(dragOver ? styles.dropZoneActive : {}),
              ...(files.length > 0 ? styles.dropZoneHasFiles : {})
            }}
            onDrop={handleDrop}
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
            {files.length === 0 ? (
              <div style={styles.dropContent}>
                <div style={styles.dropIcon}>📸</div>
                <p style={styles.dropText}>Trascina le foto qui</p>
                <p style={styles.dropHint}>oppure clicca per selezionare</p>
                <p style={styles.dropFormats}>JPG · PNG · WEBP · HEIC · GIF</p>
              </div>
            ) : (
              <div style={styles.previewGrid}>
                {previews.map((p, i) => (
                  <div key={i} style={styles.previewItem}>
                    <img src={p.url} alt={p.name} style={styles.previewImg} />
                    <button
                      style={styles.removeBtn}
                      onClick={e => { e.stopPropagation(); removeFile(i) }}
                      disabled={uploading}
                    >✕</button>
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <div style={styles.addMore}>
                    <span style={{ fontSize: 24 }}>+</span>
                    <span style={{ fontSize: 12 }}>Aggiungi</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
            </div>
            <p style={styles.progressText}>Caricamento {uploadProgress}%...</p>
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-gold"
          style={styles.submitBtn}
          onClick={handleUpload}
          disabled={uploading || !name.trim() || files.length === 0}
        >
          {uploading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Caricamento in corso...
            </>
          ) : (
            <>✦ Carica {files.length > 0 ? `${files.length} foto` : 'le foto'}</>
          )}
        </button>

        <p style={styles.privacy}>
          🔒 Le foto saranno visibili solo a Chiara e all'amministratore
        </p>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>con ❤️ per il tuo giorno speciale</p>
      </footer>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 16px 80px',
    gap: 32
  },
  header: {
    textAlign: 'center',
    paddingTop: 20
  },
  badge: {
    display: 'inline-block',
    padding: '6px 20px',
    border: '1px solid rgba(201,168,76,0.4)',
    borderRadius: 100,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: 'var(--gold)',
    marginBottom: 16,
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(56px, 12vw, 96px)',
    fontWeight: 300,
    color: 'var(--text)',
    lineHeight: 1,
    marginBottom: 16
  },
  subtitle: {
    color: 'var(--text-dim)',
    fontSize: 16,
    fontWeight: 300,
    letterSpacing: '0.02em'
  },
  formCard: {
    width: '100%',
    maxWidth: 560,
    padding: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-dim)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  },
  labelHint: {
    fontSize: 11,
    fontWeight: 400,
    color: 'var(--text-muted)',
    textTransform: 'none',
    letterSpacing: 0
  },
  dropZone: {
    border: '2px dashed var(--border)',
    borderRadius: 12,
    padding: '32px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropZoneActive: {
    borderColor: 'var(--gold)',
    background: 'rgba(201,168,76,0.05)'
  },
  dropZoneHasFiles: {
    padding: '16px',
    minHeight: 'auto'
  },
  dropContent: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  dropIcon: { fontSize: 36 },
  dropText: { color: 'var(--text)', fontSize: 15, fontWeight: 500 },
  dropHint: { color: 'var(--text-muted)', fontSize: 13 },
  dropFormats: {
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    marginTop: 4
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: 8,
    width: '100%'
  },
  previewItem: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: '1',
    background: 'rgba(255,255,255,0.05)'
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.7)',
    border: 'none',
    color: '#fff',
    fontSize: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700
  },
  addMore: {
    borderRadius: 8,
    border: '2px dashed var(--border)',
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    gap: 4
  },
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  progressBar: {
    height: 4,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--gold), var(--gold-light))',
    borderRadius: 2,
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: 13,
    color: 'var(--gold)',
    textAlign: 'center'
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px',
    fontSize: 15,
    borderRadius: 10
  },
  privacy: {
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--text-muted)'
  },
  successCard: {
    maxWidth: 480,
    width: '100%',
    padding: '60px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    marginTop: 60
  },
  successIcon: {
    fontSize: 64,
    animation: 'float 3s ease-in-out infinite'
  },
  successTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 48,
    fontWeight: 300
  },
  successText: {
    color: 'var(--text-dim)',
    lineHeight: 1.8,
    fontSize: 15
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20
  },
  footerText: {
    color: 'var(--text-muted)',
    fontSize: 13,
    letterSpacing: '0.05em'
  }
}
