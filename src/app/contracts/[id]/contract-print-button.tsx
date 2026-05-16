'use client'

export function ContractPrintButton() {
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm no-print"
      style={{ fontSize: 13 }}
      onClick={() => window.print()}
    >
      ↓ Descarcă PDF
    </button>
  )
}
