'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: 500,
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--text-primary)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      Descarcă / Printează PDF
    </button>
  )
}
