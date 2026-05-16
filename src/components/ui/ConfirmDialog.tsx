'use client'

import { useEffect } from 'react'

type Props = {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  /** Dacă true, butonul de confirmare e roșu (acțiuni distructive) */
  dangerMode?: boolean
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Dialog de confirmare pentru acțiuni ireversibile (ex: ștergere).
 * Folosit în loc de `window.confirm()` pentru un design consistent.
 */
export function ConfirmDialog({
  isOpen, onConfirm, onCancel,
  title, message,
  dangerMode = false,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
}: Props) {

  // Închide la Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: 440,
          border: `1px solid ${dangerMode ? 'var(--role-artist-dark)' : 'var(--border-medium)'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>
            {dangerMode ? '⚠️' : '❓'}
          </div>
          <h3 id="confirm-title" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
            {title}
          </h3>
          <p id="confirm-message" style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ fontSize: 13 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={dangerMode ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={onConfirm}
            style={dangerMode ? { fontSize: 13, color: 'var(--role-artist-dark)', borderColor: 'var(--role-artist-dark)' } : { fontSize: 13 }}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
