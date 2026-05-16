'use client'

import { useEffect, type ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_WIDTH: Record<Size, number> = {
  sm:  400,
  md:  560,
  lg:  720,
  xl:  900,
}

type Props = {
  isOpen: boolean
  onClose: () => void
  title: string
  /** Descriere opțională sub titlu */
  description?: string
  children: ReactNode
  size?: Size
  /** Dacă true, click pe backdrop NU închide modalul */
  preventBackdropClose?: boolean
}

/**
 * Modal generic cu backdrop, scroll intern și închidere la Escape.
 * Componenta este client-only.
 */
export function Modal({ isOpen, onClose, title, description, children, size = 'md', preventBackdropClose }: Props) {

  // Închide la tasta Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Blochează scroll-ul paginii când modalul e deschis
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        overflowY: 'auto',
      }}
      onClick={preventBackdropClose ? undefined : (e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: SIZE_WIDTH[size],
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 id="modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
            {description && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide modalul"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 18, padding: '0 0 0 16px', lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Conținut modal */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
