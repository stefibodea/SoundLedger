'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { reconcileRevenueAction } from '@/app/actions/revenues'

export type RevenueRow = {
  id: string
  source: string
  amount: number
  streams: number | null
  period: string
  description: string | null
  revenueStatus: string
  createdAt: string
  artist: { id: string; name: string } | null
}

export type ArtistOption = {
  id: string
  name: string
}

type Props = {
  revenues: RevenueRow[]
  artists: ArtistOption[]
  canManage: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YouTube Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV (CREDIDAM/UCMR-ADA)',
  SYNC_LICENSING:      'Sync Licensing',
  LICENTIERE:          'Licențiere',
  VANZARI_FIZICE:      'Vânzări fizice',
  MERCHANDISE:         'Merchandise',
  ALTE_SURSE:          'Alte surse',
  STREAMING:           'Spotify (legacy)',
  YOUTUBE:             'YouTube (legacy)',
  LICENSING:           'Licențiere (legacy)',
  PHYSICAL:            'Vânzări fizice (legacy)',
  SYNC:                'Sync (legacy)',
}

const SOURCE_STYLES: Record<string, { bg: string; color: string }> = {
  SPOTIFY:             { bg: '#dcfce7',                      color: '#15803d' },
  APPLE_MUSIC:         { bg: '#fce7f3',                      color: '#be185d' },
  YOUTUBE_MUSIC:       { bg: '#fee2e2',                      color: '#b91c1c' },
  YOUTUBE_CONTENT_ID:  { bg: '#fef9c3',                      color: '#854d0e' },
  TIKTOK:              { bg: '#f0f9ff',                      color: '#0369a1' },
  DEEZER:              { bg: '#ede9fe',                      color: '#6d28d9' },
  RADIO_TV:            { bg: 'var(--role-finance-light)',     color: 'var(--role-finance-dark)' },
  SYNC_LICENSING:      { bg: 'var(--role-ar-light)',          color: 'var(--role-ar-dark)' },
  LICENTIERE:          { bg: 'var(--role-label-light)',       color: 'var(--role-label-dark)' },
  VANZARI_FIZICE:      { bg: 'var(--bg-tertiary)',            color: 'var(--text-secondary)' },
  MERCHANDISE:         { bg: '#fdf2f8',                      color: '#9d174d' },
  ALTE_SURSE:          { bg: 'var(--bg-tertiary)',            color: 'var(--text-secondary)' },
  STREAMING:           { bg: '#dcfce7',                      color: '#15803d' },
  YOUTUBE:             { bg: '#fee2e2',                      color: '#b91c1c' },
  LICENSING:           { bg: 'var(--role-label-light)',       color: 'var(--role-label-dark)' },
  PHYSICAL:            { bg: 'var(--bg-tertiary)',            color: 'var(--text-secondary)' },
  SYNC:                { bg: 'var(--role-finance-light)',     color: 'var(--role-finance-dark)' },
}

const FILTER_LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 8,
}

export function FinanceClient({ revenues, artists, canManage }: Props) {
  const [filterSrc,   setFilterSrc]   = useState('')
  const [filterArt,   setFilterArt]   = useState('')
  const [periodFrom,  setPeriodFrom]  = useState('')
  const [periodTo,    setPeriodTo]    = useState('')

  const hasFilters = Boolean(filterSrc || filterArt || periodFrom || periodTo)

  const filtered = useMemo(() => {
    return revenues
      .filter((r) => {
        if (filterSrc && r.source !== filterSrc) return false
        if (filterArt && r.artist?.id !== filterArt) return false
        if (periodFrom && r.period < periodFrom) return false
        if (periodTo   && r.period > periodTo)   return false
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [revenues, filterSrc, filterArt, periodFrom, periodTo])

  const totalFiltered = filtered.reduce((s, r) => s + r.amount, 0)

  const exportParams = new URLSearchParams()
  if (filterSrc)  exportParams.set('source',     filterSrc)
  if (filterArt)  exportParams.set('artistId',   filterArt)
  if (periodFrom) exportParams.set('periodFrom', periodFrom)
  if (periodTo)   exportParams.set('periodTo',   periodTo)
  const exportUrl = `/api/finance/export?${exportParams.toString()}`

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Sidebar filtre ── */}
      <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 220 }}>
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{
            background: 'rgba(16,14,28,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(155,148,240,0.10)',
            borderRadius: 14,
            padding: '18px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>
                Filtrează
              </span>
              {hasFilters && (
                <button type="button" onClick={() => { setFilterSrc(''); setFilterArt(''); setPeriodFrom(''); setPeriodTo('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}>
                  Resetează
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={FILTER_LABEL}>Sursă</div>
                <select value={filterSrc} onChange={(e) => setFilterSrc(e.target.value)} className="cat-sidebar-select">
                  <option value="">Toate sursele</option>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={FILTER_LABEL}>Artist</div>
                <select value={filterArt} onChange={(e) => setFilterArt(e.target.value)} className="cat-sidebar-select">
                  <option value="">Toți artiștii</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px' }} />

              <div>
                <div style={FILTER_LABEL}>Perioadă de la</div>
                <input value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
                  className="form-input" placeholder="2026-01"
                  style={{ width: '100%', fontSize: 12, height: 32, boxSizing: 'border-box' }} />
              </div>

              <div>
                <div style={FILTER_LABEL}>Perioadă până la</div>
                <input value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
                  className="form-input" placeholder="2026-12"
                  style={{ width: '100%', fontSize: 12, height: 32, boxSizing: 'border-box' }} />
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px' }} />

              <a href={exportUrl} className="btn btn-secondary"
                style={{ width: '100%', fontSize: 12, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', boxSizing: 'border-box', padding: '0 12px' }}>
                ↓ Exportă raport{hasFilters ? ' (filtrat)' : ''}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabel ── */}
      <section className="card" style={{ marginBottom: 20 }}>
        {hasFilters && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            {filtered.length} rezultat{filtered.length !== 1 ? 'e' : ''} — total: <strong>{totalFiltered.toFixed(2)} €</strong>
          </p>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sursă</th>
                <th>Sumă</th>
                <th>Perioadă</th>
                <th>Artist</th>
                <th>Streamuri</th>
                <th>Descriere</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canManage ? 7 : 6}>Nu există venituri pentru filtrele selectate.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge" style={{
                        background: SOURCE_STYLES[r.source]?.bg ?? 'var(--bg-tertiary)',
                        color: SOURCE_STYLES[r.source]?.color ?? 'var(--text-secondary)',
                        fontSize: 12,
                      }}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                    </td>
                    <td><strong>{r.amount.toFixed(2)} €</strong></td>
                    <td>{r.period}</td>
                    <td style={{ fontSize: 13 }}>{r.artist?.name ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {r.streams != null ? r.streams.toLocaleString('ro-RO') : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description ?? '—'}
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link href={`/finance/${r.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                            Editează
                          </Link>
                          {r.revenueStatus === 'ESTIMAT' && (
                            <form action={reconcileRevenueAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap',
                                border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(110,231,183,0.1)',
                                color: '#6ee7b7', cursor: 'pointer',
                              }}>
                                Reconciliază
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
