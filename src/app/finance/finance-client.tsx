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

const SOURCE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  SPOTIFY:             { bg: 'rgba(110,231,183,0.12)', color: '#6ee7b7',  border: 'rgba(110,231,183,0.3)' },
  APPLE_MUSIC:         { bg: 'rgba(252,165,165,0.12)', color: '#fca5a5',  border: 'rgba(252,165,165,0.3)' },
  YOUTUBE_MUSIC:       { bg: 'rgba(252,165,165,0.12)', color: '#fca5a5',  border: 'rgba(252,165,165,0.3)' },
  YOUTUBE_CONTENT_ID:  { bg: 'rgba(253,230,138,0.12)', color: '#fde68a',  border: 'rgba(253,230,138,0.3)' },
  TIKTOK:              { bg: 'rgba(147,197,253,0.12)', color: '#93c5fd',  border: 'rgba(147,197,253,0.3)' },
  DEEZER:              { bg: 'rgba(155,148,240,0.12)', color: '#9B94F0',  border: 'rgba(155,148,240,0.3)' },
  RADIO_TV:            { bg: 'rgba(253,230,138,0.12)', color: '#fde68a',  border: 'rgba(253,230,138,0.3)' },
  SYNC_LICENSING:      { bg: 'rgba(110,231,183,0.12)', color: '#6ee7b7',  border: 'rgba(110,231,183,0.3)' },
  LICENTIERE:          { bg: 'rgba(147,197,253,0.12)', color: '#93c5fd',  border: 'rgba(147,197,253,0.3)' },
  VANZARI_FIZICE:      { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)' },
  MERCHANDISE:         { bg: 'rgba(252,165,165,0.12)', color: '#fca5a5',  border: 'rgba(252,165,165,0.3)' },
  ALTE_SURSE:          { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)' },
  STREAMING:           { bg: 'rgba(110,231,183,0.12)', color: '#6ee7b7',  border: 'rgba(110,231,183,0.3)' },
  YOUTUBE:             { bg: 'rgba(252,165,165,0.12)', color: '#fca5a5',  border: 'rgba(252,165,165,0.3)' },
  LICENSING:           { bg: 'rgba(147,197,253,0.12)', color: '#93c5fd',  border: 'rgba(147,197,253,0.3)' },
  PHYSICAL:            { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)' },
  SYNC:                { bg: 'rgba(110,231,183,0.12)', color: '#6ee7b7',  border: 'rgba(110,231,183,0.3)' },
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
      <style>{`
        .fn-tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {revenues.length === 0 ? 'Niciun venit înregistrat.' : 'Niciun rezultat pentru filtrele selectate.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {(['Sursă', 'Perioadă', 'Artist', 'Streamuri', 'Descriere'] as const).map((h) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                  <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'right', whiteSpace: 'nowrap' }}>Sumă</th>
                  {canManage && <th style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const style = SOURCE_STYLES[r.source]
                  const td: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }
                  return (
                    <tr key={r.id} className="fn-tr">
                      <td style={td}>
                        <span style={{ background: style?.bg ?? 'rgba(255,255,255,0.06)', color: style?.color ?? 'var(--text-secondary)', border: `1px solid ${style?.border ?? 'rgba(255,255,255,0.1)'}`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {SOURCE_LABELS[r.source] ?? r.source}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.period}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: r.artist ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.artist?.name ?? '—'}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {r.streams != null ? r.streams.toLocaleString('ro-RO') : '—'}
                        </span>
                      </td>
                      <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description ?? '—'}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
                          {r.amount.toFixed(2)} €
                        </span>
                      </td>
                      {canManage && (
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Link href={`/finance/${r.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                              Editează
                            </Link>
                            {r.revenueStatus === 'ESTIMAT' && (
                              <form action={reconcileRevenueAction} style={{ display: 'inline' }}>
                                <input type="hidden" name="id" value={r.id} />
                                <button type="submit" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap', border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(110,231,183,0.1)', color: '#6ee7b7', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  Reconciliază
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              {filtered.length > 1 && (
                <tfoot>
                  <tr>
                    <td colSpan={canManage ? 5 : 4} style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      Total ({filtered.length} înregistrări)
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
                        {totalFiltered.toFixed(2)} €
                      </span>
                    </td>
                    {canManage && <td style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
