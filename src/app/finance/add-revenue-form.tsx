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
  importRevenueCsvAction: (formData: FormData) => Promise<void>
}

type Tab = 'manual' | 'csv'

interface CsvPreview {
  fileName: string
  rowCount: number
  totalAmount: number
  totalStreams: number
}

export function AddRevenueForm({ artists, createRevenueAction, importRevenueCsvAction }: AddRevenueFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('manual')

  // Manual tab state
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [streams, setStreams] = useState('')
  const [artistId, setArtistId] = useState('')

  const period = periodFrom && periodTo && periodFrom !== periodTo
    ? `${periodFrom}/${periodTo}`
    : periodFrom

  // CSV tab state
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { result.push(current); current = '' }
      else { current += char }
    }
    result.push(current)
    return result
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) { setCsvPreview(null); return }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split(/\r?\n/)
        let rowCount = 0, totalAmount = 0, totalStreams = 0

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          const cols = parseLine(line)
          if (cols.length < 6) continue
          const amt = Number(cols[5]?.trim())
          if (!Number.isNaN(amt) && amt > 0) totalAmount += amt
          const str = parseInt(cols[4]?.trim())
          if (!Number.isNaN(str) && str > 0) totalStreams += str
          rowCount++
        }

        setCsvPreview({ fileName: file.name, rowCount, totalAmount, totalStreams })
      } catch { setCsvPreview(null) }
    }
    reader.readAsText(file)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTab('manual')
    setSource(''); setAmount(''); setPeriodFrom(''); setPeriodTo(''); setStreams(''); setArtistId('')
    setCsvPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 0',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--primary)' : 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
        style={{ fontSize: 13, height: 36, padding: '0 16px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
      >
        + Adaugă venit
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Adaugă venit" size="lg">
        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <button style={tabStyle(tab === 'manual')} onClick={() => setTab('manual')}>Introducere manuală</button>
          <button style={tabStyle(tab === 'csv')} onClick={() => setTab('csv')}>Import raport distribuitor</button>
        </div>

        {/* ── Tab Manual ── */}
        {tab === 'manual' && (
          <form action={createRevenueAction}>
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
                <label className="form-label" htmlFor="artistId">Artist</label>
                <select className="form-input form-select" id="artistId" name="artistId" value={artistId} onChange={(e) => setArtistId(e.target.value)}>
                  <option value="">Fără artist specific</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="streams">Cantitate (unități / difuzări)</label>
                <input className="form-input" id="streams" name="streams" type="text" inputMode="numeric" placeholder="ex: 250" value={streams} onChange={(e) => setStreams(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Note</label>
              <textarea
                id="description"
                name="description"
                placeholder="ex: Contract sync Netflix S3E4, decont CREDIDAM sem. I 2026..."
                style={{
                  width: '100%',
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
                  minHeight: 80,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <input type="hidden" name="revenueStatus" value="RECONCILIAT" />
            <button className="btn btn-primary" type="submit" style={{ marginTop: 14, width: '100%' }}>
              Salvează venit
            </button>
          </form>
        )}

        {/* ── Tab Import CSV ── */}
        {tab === 'csv' && (
          <form action={importRevenueCsvAction}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Importă raportul lunar de la distribuitor (Believe, DistroKid, TuneCore etc.).
              Fiecare rând din CSV devine o înregistrare separată, cu sursa și artistul detectate automat.
            </p>

            <div style={{
              border: csvPreview ? '1px solid #4ade80' : '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '24px 20px',
              background: csvPreview ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)',
              textAlign: 'center',
              transition: 'all 0.2s',
              marginBottom: 20,
            }}>
              <input
                type="file"
                id="csvFile"
                name="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'block', width: '100%', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              />
              {!csvPreview && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Format acceptat: .csv (raport Believe / distribuitor)
                </p>
              )}
            </div>

            {csvPreview && (
              <div style={{
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.25)',
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Fișier</div>
                  <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 500 }}>{csvPreview.fileName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Înregistrări</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{csvPreview.rowCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Total venituri</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{csvPreview.totalAmount.toFixed(2)} €</div>
                </div>
                {csvPreview.totalStreams > 0 && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Total streamuri</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{csvPreview.totalStreams.toLocaleString('ro-RO')}</div>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={!csvPreview}
              style={{ width: '100%', opacity: csvPreview ? 1 : 0.4, cursor: csvPreview ? 'pointer' : 'not-allowed' }}
            >
              {csvPreview ? `Importă ${csvPreview.rowCount} înregistrări` : 'Selectează un fișier CSV'}
            </button>
          </form>
        )}
      </Modal>
    </>
  )
}
