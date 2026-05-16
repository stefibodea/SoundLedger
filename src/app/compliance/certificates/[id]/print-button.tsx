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
        background: '#1a1a1a', color: '#fff',
        border: '1px solid #333',
      }}
    >
      🖨️ Printează / Salvează PDF
    </button>
  )
}
