'use client'

import React, { useState, useRef } from 'react'

interface Artist {
  id: string
  name: string
}

interface AddRevenueFormProps {
  artists: Artist[]
  createRevenueAction: (formData: FormData) => Promise<void>
}

export function AddRevenueForm({ artists, createRevenueAction }: AddRevenueFormProps) {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('')
  const [streams, setStreams] = useState('')
  const [artistId, setArtistId] = useState('')
  const [description, setDescription] = useState('')

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
        setPeriod(detectedPeriod || new Date().toISOString().substring(0, 7))
        setStreams(totalStreams > 0 ? String(totalStreams) : '')
        setDescription(`Import digital din fișierul ${file.name}`)

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
    setDescription('')
    setArtistId('')
  }

  return (
    <section className="card" style={{ marginBottom: 20, transition: 'all 0.3s ease' }}>
      <h3 style={{ marginBottom: 12 }}>Adaugă venit</h3>

      <form action={createRevenueAction}>
        {/* CSV Autocompletion / Upload Field */}
        <div style={{
          background: csvInfo ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)',
          border: csvInfo ? '1px dashed #4ade80' : '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 20,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Încarcă raport distribuitor (CSV)
            </h4>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              id="file"
              name="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="form-input"
              style={{ flex: 1, minWidth: 200, paddingTop: 5, paddingBottom: 5 }}
            />
            {csvInfo && (
              <button
                type="button"
                onClick={handleClearFile}
                className="btn btn-secondary btn-sm"
                style={{ height: 36, color: 'var(--status-expired)' }}
              >
                Anulează fișier
              </button>
            )}
          </div>

          {csvInfo && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#4ade80', lineHeight: 1.5 }}>
              ✅ <strong>Fișier selectat:</strong> {csvInfo.fileName} ({csvInfo.rowCount} înregistrări).
              <br />
              Formularul a fost completat automat cu valoarea totală de <strong>{csvInfo.totalAmount.toFixed(2)} €</strong> și <strong>{csvInfo.totalStreams.toLocaleString()} stream-uri</strong>! Submite formularul pentru a finaliza importul.
            </div>
          )}
        </div>

        {/* Manual fields */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="source">
              Sursă <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <select
              className="form-input form-select"
              id="source"
              name="source"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Selectează o sursă...</option>
              <option value="SPOTIFY">Spotify</option>
              <option value="APPLE_MUSIC">Apple Music</option>
              <option value="YOUTUBE_MUSIC">YouTube Music</option>
              <option value="YOUTUBE_CONTENT_ID">YouTube Content ID</option>
              <option value="TIKTOK">TikTok</option>
              <option value="DEEZER">Deezer</option>
              <option value="RADIO_TV">Radio &amp; TV (CREDIDAM/UCMR-ADA)</option>
              <option value="SYNC_LICENSING">Sync Licensing</option>
              <option value="LICENTIERE">Licențiere</option>
              <option value="VANZARI_FIZICE">Vânzări fizice</option>
              <option value="MERCHANDISE">Merchandise</option>
              <option value="ALTE_SURSE">Alte surse</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="amount">
              Suma (€) <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="ex: 1250.75"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="period">
              Perioadă <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="period"
              name="period"
              placeholder="ex: 2026-03"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="streams">
              Nr. streamuri <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="streams"
              name="streams"
              type="text"
              inputMode="numeric"
              placeholder="ex: 142500"
              required
              value={streams}
              onChange={(e) => setStreams(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="artistId">
              Artist <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <select
              className="form-input form-select"
              id="artistId"
              name="artistId"
              required
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
            >
              <option value="">Selectează un artist...</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Descriere / notă <span style={{ color: 'var(--status-expired)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="description"
              name="description"
              placeholder="ex: Factură sync sau licențiere"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <input type="hidden" name="revenueStatus" value="RECONCILIAT" />

        <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>
          {csvInfo ? '🚀 Salvează și Importă Raport' : 'Salvează venit'}
        </button>
      </form>
    </section>
  )
}
