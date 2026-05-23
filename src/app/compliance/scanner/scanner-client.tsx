'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { Search, Circle, ChevronDown } from 'lucide-react'
import { StatusBadge, detectionStatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { analyzeSuspectTrackAction } from '@/app/actions/scanner'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type DetectionRow = {
  id: string
  suspectTitle: string | null
  suspectArtist: string | null
  platform: string | null
  status: string
  topMatchScore: number | null
  topMatchTrackName: string | null
  analyzedAt: string | null
  createdAt: string
  hasError: boolean
}

type StatusFilter = 'all' | 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'RESOLVED'

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'În analiză',
  CONFIRMED: 'Confirmat',
  DISMISSED: 'Respins',
  RESOLVED:  'Rezolvat',
}

type Props = {
  detections: DetectionRow[]
  canManage: boolean
  serviceOnline: boolean
  fingerprintCount: number
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── FilterSection collapsible ─────────────────────────────────────────────────

function FilterSection({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', marginTop: 20 }}
      >
        <span style={{ color: 'rgba(200,198,188,0.40)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.50)', flex: 1, textAlign: 'left' }}>{label}</span>
        <ChevronDown size={12} style={{ color: 'rgba(200,198,188,0.30)', transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>
      <div style={{ overflow: 'hidden', maxHeight: open ? 500 : 0, transition: 'max-height 0.2s ease' }}>{children}</div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScannerClient({ detections, canManage, serviceOnline, fingerprintCount }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return detections.filter((d) => {
      if (q && !(d.suspectArtist?.toLowerCase().includes(q) ?? false) && !(d.suspectTitle?.toLowerCase().includes(q) ?? false)) return false
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      return true
    })
  }, [detections, search, statusFilter])

  const hasActiveFilters = Boolean(search || statusFilter !== 'all')
  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  const columns: Column<DetectionRow>[] = [
    {
      key: 'suspect',
      header: 'Piesă suspectă',
      render: (d) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: 13 }}>{d.suspectTitle ?? 'Titlu necunoscut'}</strong>
            {d.hasError && (
              <span style={{
                fontSize: 10,
                color: 'var(--role-finance-dark)',
                background: 'rgba(253,230,138,0.15)',
                padding: '1px 5px',
                borderRadius: 4,
              }}>
                ⚠ Eroare
              </span>
            )}
          </div>
          {d.suspectArtist && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.suspectArtist}</div>
          )}
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Platformă',
      width: '110px',
      render: (d) => d.platform
        ? <span className="badge">{d.platform}</span>
        : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>,
    },
    {
      key: 'topMatch',
      header: 'Top match',
      width: '190px',
      render: (d) => {
        if (!d.topMatchScore) {
          return d.status === 'PENDING' && d.analyzedAt === null
            ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⏳ În procesare</span>
            : <span style={{ color: 'var(--text-secondary)' }}>—</span>
        }
        const pct   = Math.round(d.topMatchScore * 100)
        const color = pct >= 80 ? 'var(--role-artist-dark)'
          : pct >= 60 ? 'var(--role-finance-dark)'
          : 'var(--text-secondary)'
        return (
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color }}>{pct}%</span>
            {d.topMatchTrackName && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {d.topMatchTrackName}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (d) => (
        <StatusBadge label={STATUS_LABELS[d.status] ?? d.status} variant={detectionStatusVariant(d.status)} />
      ),
    },
    {
      key: 'date',
      header: 'Raportat la',
      width: '100px',
      render: (d) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(d.createdAt)}</span>,
    },
    {
      key: 'link',
      header: '',
      width: '110px',
      render: (d) => (
        <a href={`/compliance/scanner/${d.id}`} style={{ color: 'var(--primary)', fontSize: 12, whiteSpace: 'nowrap' }}>
          Vezi raport →
        </a>
      ),
    },
  ]

  return (
    <>
      <style>{`
        .filter-search-input {
          display: block; width: 100%; height: 40px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05);
          color: var(--text-primary); font-size: 13px;
          padding: 0 16px 0 40px; outline: none; font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
        }
        .filter-search-input:focus {
          border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10);
        }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.5); }
      `}</style>

      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre: absolute în stânga conținutului ──────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>Filtre</p>

            <FilterSection label="Caută" icon={<Search size={11} />}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input className="filter-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artist sau titlu..." />
              </div>
            </FilterSection>

            <FilterSection label="Status" icon={<Circle size={11} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([
                  { value: 'all',       label: 'Toate' },
                  { value: 'PENDING',   label: 'Analiză' },
                  { value: 'CONFIRMED', label: 'Confirmat' },
                  { value: 'RESOLVED',  label: 'Rezolvat' },
                  { value: 'DISMISSED', label: 'Respins' },
                ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setStatusFilter(value)} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s ease', fontFamily: 'inherit',
                    background: statusFilter === value ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)',
                    border: statusFilter === value ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    color: statusFilter === value ? '#9B94F0' : 'rgba(200,198,188,0.60)',
                    fontWeight: statusFilter === value ? 500 : 400,
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 20, paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: hasActiveFilters ? 8 : 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filtered.length}</span>
                {' '}{filtered.length === 1 ? 'detecție' : 'detecții'}
              </div>
              {hasActiveFilters && (
                <button type="button" className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', width: '100%' }}
                  onClick={resetFilters}
                >
                  Resetează filtrele
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Conținut ────────────────────────────────────────────────── */}

      {/* ── Formular upload piesă suspectă ─────────────────────────────── */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Raportează o piesă suspectă</h3>
        <form action={analyzeSuspectTrackAction}>
          {/* Câmp principal: fișier audio */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="file">
              Fișier audio piesă suspectă{' '}
              <span style={{ color: 'var(--role-artist-dark)' }}>*</span>
            </label>
            <input
              className="form-input"
              id="file"
              name="file"
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
              required
              style={{ padding: '8px 12px' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Încarcă MP3-ul piesei pe care o suspectezi că folosește muzica ta. Maxim 50MB.
            </div>
          </div>

          {/* Câmpuri secundare — 2 coloane */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="suspectTitle">Titlu piesă suspectă</label>
              <input
                className="form-input"
                id="suspectTitle"
                name="suspectTitle"
                placeholder="ex: Dragostea din tei (AI cover)"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="suspectArtist">Artist suspect</label>
              <input
                className="form-input"
                id="suspectArtist"
                name="suspectArtist"
                placeholder="ex: Lolita Cercel"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="platform">Platformă</label>
              <select className="form-input form-select" id="platform" name="platform">
                <option value="">Selectează...</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Spotify">Spotify</option>
                <option value="SoundCloud">SoundCloud</option>
                <option value="Apple Music">Apple Music</option>
                <option value="Instagram">Instagram</option>
                <option value="Altele">Altele</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="suspectUrl">URL piesă suspectă</label>
              <input
                className="form-input"
                id="suspectUrl"
                name="suspectUrl"
                type="url"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label" htmlFor="notes">Note suplimentare</label>
            <textarea
              className="form-input form-textarea"
              id="notes"
              name="notes"
              rows={3}
              placeholder="De ce consideri că această piesă a folosit muzica ta? Detalii observate, context..."
            />
          </div>

          {/* Status serviciu */}
          {!serviceOnline && (
            <div
              className="card"
              style={{
                borderLeft: '3px solid var(--role-artist-dark)',
                marginBottom: 12,
                padding: '10px 14px',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: 'var(--role-artist-dark)' }}>
                ⚠ Serviciul de analiză audio este offline. Pornește-l cu{' '}
                <code>npm run dev:all</code>.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!serviceOnline || !canManage}
            >
              🎵 Analizează audio cu ML
            </button>
            {serviceOnline && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Sistemul ML va analiza piesa prin Chromaprint (detecție copiere directă) și OpenL3 (similaritate semantică) și o va compara cu catalogul tău de{' '}
                <strong>{fingerprintCount}</strong>{' '}
                {fingerprintCount === 1 ? 'piesă cu amprentă calculată' : 'piese cu amprentă calculată'}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Tabel detecții ─────────────────────────────────────────────── */}
      <section className="card">
        <DataTable
          data={filtered}
          columns={columns}
          getRowKey={(d) => d.id}
          pageSize={20}
          emptyState={
            <EmptyState
              icon="🔍"
              title="Nicio detecție găsită"
              description={
                hasActiveFilters
                  ? 'Nicio detecție nu corespunde filtrelor curente.'
                  : 'Nicio piesă raportată încă. Folosește formularul de mai sus pentru a raporta prima piesă suspectă.'
              }
              action={
                hasActiveFilters
                  ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                  : undefined
              }
            />
          }
        />
      </section>

      </div>{/* end relative */}
    </>
  )
}
