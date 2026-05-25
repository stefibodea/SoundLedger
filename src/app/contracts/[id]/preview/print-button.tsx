'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 20px', borderRadius: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: 600,
        background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
        color: 'white',
        border: 'none',
        boxShadow: '0 0 12px rgba(56,189,248,0.25)',
      }}
    >
      Descarcă PDF
    </button>
  )
}
