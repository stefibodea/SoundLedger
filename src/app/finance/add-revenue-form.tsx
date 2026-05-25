'use client'

import React, { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'

interface Artist {
  id: string
  name: string
}

interface AddRevenueFormProps {
  artists: Artist[]
  createRevenueAction: (formData: FormData) => Promise<void>
}

export function AddRevenueForm({ artists, createRevenueAction }: AddRevenueFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [streams, setStreams] = useState('')
  const [artistId, setArtistId] = useState('')

  const period = periodFrom && periodTo && periodFrom !== periodTo
    ? `${periodFrom}/${periodTo}`
    : periodFrom

  // CSV parsing status
  const [csvInfo, setCsvInfo] = useState<{
    fileName: string
    rowCount: number
    totalAmount: number
    totalStreams: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Standard sources helper
  const VALID_REVENUE_SOURCES = [
    'SPOTIFY', 'APPLE_MUSIC', 'YOUTUBE_MUSIC', 'YOUTUBE_CONTENT_ID', 'TIKTOK', 'DEEZER',
    'RADIO_TV', 'SYNC_LICENSING', 'LICENTIERE', 'VANZARI_FIZICE', 'MERCHANDISE', 'ALTE_SURSE'
  ]

  // Client-side parser for CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setCsvInfo(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/)
        if (lines.length <= 1) return

        let rowCount = 0
        let totalAmount = 0
        let totalStreams = 0
        let detectedSource = 'SPOTIFY'
        let detectedPeriod = ''
        let detectedArtistName = ''

        // Simple parse helper for standard CSV line
        const parseLine = (line: string) => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current)
              current = ''
            } else {
              current += char
            }
          }
          result.push(current)
          return result
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const cols = parseLine(line)
          if (cols.length < 6) continue

          const artistName = cols[2]?.trim()
          const src = cols[3]?.trim()?.toUpperCase() || 'SPOTIFY'
          const strRaw = cols[4]?.trim()
          const amtRaw = cols[5]?.trim()
          const per = cols[6]?.trim()

          const amt = Number(amtRaw)
          if (!Number.isNaN(amt) && amt > 0) {
            totalAmount += amt
          }

          const str = strRaw ? parseInt(strRaw) : 0
          if (!Number.isNaN(str) && str > 0) {
            totalStreams += str
          }

          if (rowCount === 0) {
            if (VALID_REVENUE_SOURCES.includes(src)) {
              detectedSource = src
            }
            if (per) {
              detectedPeriod = per
            }
            if (artistName) {
              detectedArtistName = artistName
            }
          }
          rowCount++
        }

        // Set state for visual autocompletion feedback
        setSource(detectedSource)
        setAmount(totalAmount.toFixed(2))
        const p = detectedPeriod || new Date().toISOString().substring(0, 7)
        setPeriodFrom(p)
        setPeriodTo(p)
        setStreams(totalStreams > 0 ? String(totalStreams) : '')

        // Map artist name to ID
        if (detectedArtistName) {
          const matched = artists.find(
            (a) => a.name.toLowerCase() === detectedArtistName.toLowerCase()
          )
          if (matched) {
            setArtistId(matched.id)
          } else {
            setArtistId('')
          }
        }

        setCsvInfo({
          fileName: file.name,
          rowCount,
          totalAmount,
          totalStreams,
        })
      } catch (err) {
        console.error('Error parsing CSV file client-side:', err)
      }
    }
    reader.readAsText(file)
  }

  const handleClearFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setCsvInfo(null)
    setAmount('')
    setStreams('')
    setArtistId('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
          color: 'white',
          border: 'none',
          padding: '8px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'opacity 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        + Adaugă venit
      </button>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); handleClearFile() }} title="Adaugă venit" size="lg">
        <form action={createRevenueAction}>
          {/* CSV upload + Note */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="form-label">Raport distribuitor</label>
              <div style={{
                flex: 1,
                background: csvInfo ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                border: csvInfo ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="form-input"
                  style={{ width: '100%', paddingTop: 5, paddingBottom: 5, fontSize: 12 }}
                />
                {csvInfo ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#4ade80', lineHeight: 1.5 }}>
                    ✅ {csvInfo.fileName} — {csvInfo.rowCount} rânduri, <strong>{csvInfo.totalAmount.toFixed(2)} €</strong>
                    <button type="button" onClick={handleClearFile} style={{ marginLeft: 8, fontSize: 11, background: 'none', border: 'none', color: 'var(--status-expired)', cursor: 'pointer', padding: 0 }}>
                      × anulează
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>Format acceptat: .csv</p>
                )}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="form-label" htmlFor="description">Note</label>
              <textarea
                id="description"
                name="description"
                placeholder="ex: Contract sync Netflix S3E4, decont CREDIDAM sem. I 2026..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.6,
                  minHeight: 90,
                }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="source">
                Sursă <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <select className="form-input form-select" id="source" name="source" required value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">Selectează o sursă...</option>
                <option value="SYNC_LICENSING">Sync Licensing</option>
                <option value="RADIO_TV">Radio &amp; TV (CREDIDAM/UCMR-ADA)</option>
                <option value="VANZARI_FIZICE">Vânzări fizice</option>
                <option value="MERCHANDISE">Merchandise</option>
                <option value="LICENTIERE">Licențiere</option>
                <option value="ALTE_SURSE">Alte surse</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Suma (€) <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <input className="form-input" id="amount" name="amount" type="text" inputMode="decimal" placeholder="ex: 1250.75" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="periodFrom">
                Perioadă de la <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <input className="form-input" id="periodFrom" type="month" required value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="periodTo">
                Perioadă până la <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <input className="form-input" id="periodTo" type="month" required value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
          </div>
          <input type="hidden" name="period" value={period} />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="artistId">
                Artist <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <select className="form-input form-select" id="artistId" name="artistId" required value={artistId} onChange={(e) => setArtistId(e.target.value)}>
                <option value="">Selectează un artist...</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="streams">
                Cantitate (unități / difuzări) <span style={{ color: 'var(--status-expired)' }}>*</span>
              </label>
              <input className="form-input" id="streams" name="streams" type="text" inputMode="numeric" placeholder="ex: 250" required value={streams} onChange={(e) => setStreams(e.target.value)} />
            </div>
          </div>

          <input type="hidden" name="revenueStatus" value="RECONCILIAT" />

          <button className="btn btn-primary" type="submit" style={{ marginTop: 14, width: '100%' }}>
            {csvInfo ? '🚀 Salvează și Importă Raport' : 'Salvează venit'}
          </button>
        </form>
      </Modal>
    </>
  )
}
