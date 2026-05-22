'use client'

import { useState, useMemo } from 'react'
import { FilterBar } from '@/components/ui/FilterBar'
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
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Caută după artist sau titlu..."
        chips={{
          value:       statusFilter,
          activeValue: statusFilter,
          onChange:    (v) => setStatusFilter(v as StatusFilter),
          options: [
            { value: 'all',       label: 'Toate' },
            { value: 'PENDING',   label: 'În analiză' },
            { value: 'CONFIRMED', label: 'Confirmate' },
            { value: 'RESOLVED',  label: 'Rezolvate' },
            { value: 'DISMISSED', label: 'Respinse' },
          ],
        }}
        resultsCount={filtered.length}
        resultsLabel={filtered.length === 1 ? 'detecție' : 'detecții'}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

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
    </>
  )
}
