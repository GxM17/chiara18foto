import React from 'react'
import { useToast } from '../utils/ToastContext.jsx'

const icons = {
  success: '✓',
  error: '✕',
  info: '✦'
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
          style={{ cursor: 'pointer' }}
        >
          <span>{icons[toast.type] || '✦'}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
