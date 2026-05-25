'use client'

import { useEffect, useState } from 'react'

type Props = {
  amount: string
  artist: string
  percent: string
}

export function SuccessBanner({ amount, artist, percent }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        background: 'rgba(110,231,183,0.08)',
        border: '1px solid rgba(110,231,183,0.3)',
        borderLeft: '3px solid #6ee7b7',
        borderRadius: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ color: '#6ee7b7', fontSize: 14 }}>
        Venit înregistrat. Royalty de <strong>{amount}€</strong> generat automat pentru{' '}
        <strong>{artist}</strong> ({percent}% conform contractului).
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6ee7b7',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
          padding: '0 4px',
          flexShrink: 0,
        }}
        aria-label="Închide"
      >
        ×
      </button>
    </div>
  )
}
