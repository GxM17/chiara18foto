import React, { useEffect, useState, useRef } from 'react'

// Animated particle system
function Particles({ count = 40 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 6,
    duration: Math.random() * 4 + 4,
    opacity: Math.random() * 0.7 + 0.3,
    drift: (Math.random() - 0.5) * 60
  }))

  return (
    <div style={styles.particleContainer}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            ...styles.particle,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`
          }}
        />
      ))}
    </div>
  )
}

// Orbiting rings
function OrbitalRings() {
  return (
    <div style={styles.orbitalContainer}>
      <div style={{ ...styles.ring, ...styles.ring1 }} />
      <div style={{ ...styles.ring, ...styles.ring2 }} />
      <div style={{ ...styles.ring, ...styles.ring3 }} />
      <div style={styles.innerGlow} />
    </div>
  )
}

// Progress dots
function ProgressDots({ progress }) {
  const dots = 5
  const filled = Math.round((progress / 100) * dots)
  return (
    <div style={styles.dotsRow}>
      {Array.from({ length: dots }, (_, i) => (
        <div
          key={i}
          style={{
            ...styles.dot,
            ...(i < filled ? styles.dotFilled : {}),
            transitionDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}

export default function LoadingScreen({
  visible = true,
  progress = 0,
  status = '',
  title = 'Caricamento in corso',
  subtitle = 'un momento...',
  onComplete
}) {
  const [opacity, setOpacity] = useState(visible ? 1 : 0)
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      setTimeout(() => setOpacity(1), 10)
    } else {
      setOpacity(0)
      setTimeout(() => setMounted(false), 600)
      if (onComplete) setTimeout(onComplete, 600)
    }
  }, [visible])

  if (!mounted) return null

  return (
    <div style={{ ...styles.overlay, opacity }}>
      <style>{css}</style>

      <Particles count={50} />

      {/* Radial background pulse */}
      <div style={styles.bgPulse} />
      <div style={styles.bgPulse2} />

      {/* Main content */}
      <div style={styles.content}>
        <OrbitalRings />

        <div style={styles.textBlock}>
          <div style={styles.eighteenBadge}>
            <span style={styles.badgeNum}>18</span>
          </div>
          <h1 style={styles.mainTitle}>
            <span style={styles.titleItalic}>Chiara</span>
          </h1>
          <p style={styles.statusText}>{status || subtitle}</p>
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div style={styles.progressWrap}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }}>
                <div style={styles.progressGlow} />
              </div>
            </div>
            <ProgressDots progress={progress} />
            <p style={styles.progressNum}>{progress}%</p>
          </div>
        )}
      </div>

      {/* Corner decorations */}
      <div style={{ ...styles.corner, top: 20, left: 20 }}>✦</div>
      <div style={{ ...styles.corner, top: 20, right: 20 }}>✦</div>
      <div style={{ ...styles.corner, bottom: 20, left: 20 }}>✦</div>
      <div style={{ ...styles.corner, bottom: 20, right: 20 }}>✦</div>
    </div>
  )
}

// Compact inline loading (for button states)
export function InlineLoader({ text = 'Caricamento...', size = 'md' }) {
  const s = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <style>{css}</style>
      <span style={{ ...styles.spinRing, width: s, height: s, borderWidth: 2 }} />
      <span style={{ color: 'var(--gold)', fontSize: s - 2 }}>{text}</span>
    </span>
  )
}

// Upload progress overlay (attaches over the form)
export function UploadOverlay({ visible, progress, status, fileName }) {
  if (!visible) return null
  return (
    <div style={styles.uploadOverlay}>
      <style>{css}</style>
      <Particles count={20} />
      <div style={styles.uploadContent}>
        <div style={styles.uploadRing}>
          <svg viewBox="0 0 100 100" style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="url(#goldGrad)" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c9a84c" />
                <stop offset="100%" stopColor="#e8c96a" />
              </linearGradient>
            </defs>
          </svg>
          <div style={styles.uploadPercent}>{progress}%</div>
        </div>
        <p style={styles.uploadStatus}>{status}</p>
        {fileName && <p style={styles.uploadFile}>📎 {fileName}</p>}
      </div>
    </div>
  )
}

const css = `
  @keyframes floatUp {
    0% { transform: translateY(110vh) translateX(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.8; }
    100% { transform: translateY(-10vh) translateX(var(--drift, 0)); opacity: 0; }
  }
  @keyframes spin1 { from { transform: rotateX(70deg) rotateZ(0deg); } to { transform: rotateX(70deg) rotateZ(360deg); } }
  @keyframes spin2 { from { transform: rotateX(70deg) rotateZ(120deg); } to { transform: rotateX(70deg) rotateZ(480deg); } }
  @keyframes spin3 { from { transform: rotateX(70deg) rotateZ(240deg); } to { transform: rotateX(70deg) rotateZ(600deg); } }
  @keyframes pulseGlow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
  @keyframes pulseGlow2 { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.15); } }
  @keyframes shimmerText {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes badgePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); } 50% { box-shadow: 0 0 0 12px rgba(201,168,76,0); } }
  @keyframes spinRing { to { transform: rotate(360deg); } }
  @keyframes cornerFloat { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
  @keyframes progressGlowAnim { 0% { opacity: 0; left: -30%; } 100% { opacity: 1; left: 120%; } }
`

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'radial-gradient(ellipse at center, #1a0838 0%, #0a0318 50%, #050010 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden'
  },
  particleContainer: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' },
  particle: {
    position: 'absolute', bottom: '-10px', borderRadius: '50%',
    background: 'radial-gradient(circle, #e8c96a 0%, #c9a84c 50%, transparent 100%)',
    animationName: 'floatUp', animationTimingFunction: 'linear',
    animationIterationCount: 'infinite'
  },
  bgPulse: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(120,40,200,0.3) 0%, transparent 70%)',
    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    animation: 'pulseGlow 3s ease-in-out infinite'
  },
  bgPulse2: {
    position: 'absolute', width: 900, height: 900, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
    top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    animation: 'pulseGlow2 4s ease-in-out infinite 1s'
  },
  content: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 },
  orbitalContainer: { position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 800 },
  ring: {
    position: 'absolute', borderRadius: '50%',
    border: '1.5px solid',
    boxShadow: '0 0 15px rgba(201,168,76,0.3)'
  },
  ring1: {
    width: 120, height: 120,
    borderColor: 'rgba(201,168,76,0.8)',
    animation: 'spin1 3s linear infinite'
  },
  ring2: {
    width: 150, height: 150,
    borderColor: 'rgba(201,168,76,0.4)',
    animation: 'spin2 4s linear infinite reverse'
  },
  ring3: {
    width: 100, height: 100,
    borderColor: 'rgba(200,100,255,0.5)',
    animation: 'spin3 2s linear infinite'
  },
  innerGlow: {
    width: 60, height: 60, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(201,168,76,0.6) 0%, rgba(120,40,200,0.3) 50%, transparent 100%)',
    animation: 'pulseGlow 2s ease-in-out infinite'
  },
  textBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  eighteenBadge: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'badgePulse 2s ease-in-out infinite'
  },
  badgeNum: { fontSize: 22, fontWeight: 700, color: '#0a0318', fontFamily: 'var(--font-display)' },
  mainTitle: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 300,
    lineHeight: 1, margin: 0,
    background: 'linear-gradient(90deg, #7a6230, #e8c96a, #c9a84c, #e8c96a, #7a6230)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'shimmerText 3s linear infinite'
  },
  titleItalic: { fontStyle: 'italic' },
  statusText: { color: 'rgba(201,168,76,0.7)', fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 300 },
  progressWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 280 },
  progressTrack: {
    width: '100%', height: 3,
    background: 'rgba(201,168,76,0.15)', borderRadius: 2, overflow: 'hidden', position: 'relative'
  },
  progressFill: {
    height: '100%', position: 'relative',
    background: 'linear-gradient(90deg, #c9a84c, #e8c96a)',
    borderRadius: 2, transition: 'width 0.4s ease'
  },
  progressGlow: {
    position: 'absolute', top: 0, width: '30%', height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
    animation: 'progressGlowAnim 1.5s ease-in-out infinite'
  },
  dotsRow: { display: 'flex', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    border: '1.5px solid rgba(201,168,76,0.4)',
    transition: 'all 0.3s ease'
  },
  dotFilled: {
    background: 'var(--gold)',
    border: '1.5px solid var(--gold)',
    boxShadow: '0 0 8px rgba(201,168,76,0.6)'
  },
  progressNum: { color: 'var(--gold)', fontSize: 13, letterSpacing: '0.05em' },
  corner: {
    position: 'absolute', color: 'rgba(201,168,76,0.5)', fontSize: 16,
    animation: 'cornerFloat 3s ease-in-out infinite',
    animationDelay: 'calc(var(--i, 0) * 0.5s)'
  },
  spinRing: {
    display: 'inline-block', borderRadius: '50%',
    border: '2px solid rgba(201,168,76,0.2)',
    borderTopColor: 'var(--gold)',
    animation: 'spinRing 0.8s linear infinite'
  },
  uploadOverlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    background: 'rgba(10,3,24,0.92)', backdropFilter: 'blur(12px)',
    borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden'
  },
  uploadContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' },
  uploadRing: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  uploadPercent: {
    position: 'absolute', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 300,
    color: 'var(--gold-light)'
  },
  uploadStatus: { color: 'rgba(201,168,76,0.8)', fontSize: 14, letterSpacing: '0.08em', textAlign: 'center' },
  uploadFile: { color: 'rgba(255,255,255,0.4)', fontSize: 12, maxWidth: 200, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
}
