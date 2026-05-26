'use client'

import { useRef, useState } from 'react'
import { importRevenueCsvAction } from '@/app/actions/revenues'

export function ImportCsvForm() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form action={importRevenueCsvAction} onSubmit={() => setLoading(true)}>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          setFileName(file?.name ?? null)
        }}
      />
      {!fileName ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 13 }}
          onClick={() => inputRef.current?.click()}
        >
          ↑ Import CSV
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 12, color: 'var(--text-secondary)',
            maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {fileName}
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: 12 }}
            disabled={loading}
          >
            {loading ? 'Se importă...' : 'Importează'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '5px 8px' }}
            onClick={() => {
              setFileName(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
          >
            ✕
          </button>
        </div>
      )}
    </form>
  )
}
