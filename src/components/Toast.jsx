import React from 'react'
import { useToast } from '../utils/ToastContext.jsx'
const icons = { success: '✓', error: '✕', info: '✦' }
export default function Toast() {
  const { toasts, removeToast } = useToast()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)} style={{ cursor: 'pointer' }}>
          <span>{icons[t.type] || '✦'}</span><span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
