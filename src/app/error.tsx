'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  const isTenantError =
    error.message?.toLowerCase().includes('tenant') ||
    error.message?.toLowerCase().includes('labelid')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#0f0f0f',
      color: '#e0e0e0',
      fontFamily: 'inherit'
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        padding: '32px 36px',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>
          {isTenantError ? '' : ''}
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
          {isTenantError ? 'Acces interzis' : 'A apărut o eroare'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#888', lineHeight: 1.6 }}>
          {isTenantError
            ? 'Nu ai permisiunea de a accesa această resursă.'
            : 'Ceva nu a funcționat corect. Dacă problema persistă, contactează administratorul.'}
        </p>
        {error.digest && (
          <p style={{ margin: '0 0 20px', fontSize: 11, color: '#555' }}>
            Cod eroare: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={reset}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#6c63ff', color: '#fff', fontSize: 14, fontWeight: 600,
            }}
          >
            Încearcă din nou
          </button>
          <a
            href="/dashboard"
            style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid #333',
              color: '#aaa', fontSize: 14, textDecoration: 'none', display: 'inline-block',
            }}
          >
            Acasă
          </a>
        </div>
      </div>
    </div>
  )
}
