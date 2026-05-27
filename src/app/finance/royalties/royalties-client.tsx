'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { markPeriodRoyaltiesPaidAction, cancelRoyaltyAction } from '@/app/actions/revenues'

export type RoyaltyRow = {
  id: string
  amount: number
  period: string
  status: string
  paidAt: string | null
  notes: string | null
  createdAt: string
  artist: { id: string; name: string; photo: string | null }
  revenue: { id: string; source: string; period: string; revenueStatus: string } | null
}

export type PendingPeriod = {
  period: string
  count: number
  total: number
  artistCount: number
}

export type ArtistOption = {
  id:             string
  name:           string
  photo:          string | null
  contractId:     string
  royaltyPercent: number
}

type StatusFilter = 'all' | 'PENDING' | 'PAID' | 'CANCELLED'

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:            'Spotify',
  APPLE_MUSIC:        'Apple Music',
  YOUTUBE_MUSIC:      'YouTube Music',
  YOUTUBE_CONTENT_ID: 'YouTube Content ID',
  TIKTOK:             'TikTok',
  DEEZER:             'Deezer',
  RADIO_TV:           'Radio & TV',
  SYNC_LICENSING:     'Sync Licensing',
  LICENTIERE:         'Licențiere',
  VANZARI_FIZICE:     'Vânzări fizice',
  MERCHANDISE:        'Merchandise',
  ALTE_SURSE:         'Alte surse',
  STREAMING:          'Spotify',
  YOUTUBE:            'YouTube',
  LICENSING:          'Licențiere',
  PHYSICAL:           'Vânzări fizice',
  SYNC:               'Sync',
}

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'Toate' },
  { value: 'PENDING',   label: 'În așteptare' },
  { value: 'PAID',      label: 'Plătite' },
  { value: 'CANCELLED', label: 'Anulate' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING') return (
    <span style={{ background: 'rgba(253,230,138,0.15)', color: '#fde68a', border: '1px solid rgba(253,230,138,0.3)', fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      În așteptare
    </span>
  )
  if (status === 'PAID') return (
    <span style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      Plătit
    </span>
  )
  return (
    <span style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      Anulat
    </span>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
        border: active ? '1px solid var(--primary)' : '1px solid var(--border-light)',
        background: active ? 'rgba(155,148,240,0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-secondary)',
        transition: 'all 0.15s ease',
        width: '100%', textAlign: 'left',
      }}
    >
      {label}
    </button>
  )
}

const SOURCE_CSV_LABELS: Record<string, string> = {
  SPOTIFY: 'Spotify', APPLE_MUSIC: 'Apple Music', YOUTUBE_MUSIC: 'YouTube Music',
  YOUTUBE_CONTENT_ID: 'YouTube Content ID', TIKTOK: 'TikTok', DEEZER: 'Deezer',
  RADIO_TV: 'Radio & TV', SYNC_LICENSING: 'Sync Licensing', LICENTIERE: 'Licențiere',
  VANZARI_FIZICE: 'Vânzări fizice', MERCHANDISE: 'Merchandise', ALTE_SURSE: 'Alte surse',
  STREAMING: 'Spotify', YOUTUBE: 'YouTube', LICENSING: 'Licențiere',
  PHYSICAL: 'Vânzări fizice', SYNC: 'Sync',
}


function exportCsv(rows: RoyaltyRow[]) {
  const header = ['Artist', 'Sumă (€)', 'Perioadă', 'Status', 'Venit asociat', 'Plătit la', 'Note']
  const lines = rows.map((r) => [
    r.artist.name,
    r.amount.toFixed(2),
    r.period,
    r.status === 'PENDING' ? 'În așteptare' : r.status === 'PAID' ? 'Plătit' : 'Anulat',
    r.revenue ? `${SOURCE_CSV_LABELS[r.revenue.source] ?? r.revenue.source} · ${r.revenue.period}` : '',
    r.paidAt ? new Date(r.paidAt).toLocaleDateString('ro-RO') : '',
    r.notes ?? '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv  = [header.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `redevente-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type Props = {
  royalties:      RoyaltyRow[]
  canManage:      boolean
  artistOptions:  ArtistOption[]
  pendingPeriods: PendingPeriod[]
  success?:       string
  error?:         string
}

export function RoyaltiesClient({ royalties, canManage, artistOptions, pendingPeriods, success, error }: Props) {
  const [artistFilter, setArtistFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState('')

  const filtered = useMemo(() => royalties.filter((r) => {
    if (artistFilter && r.artist.id !== artistFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (periodFilter && r.period !== periodFilter.trim()) return false
    return true
  }), [royalties, artistFilter, statusFilter, periodFilter])

  const hasFilters = Boolean(artistFilter || statusFilter !== 'all' || periodFilter)

  type AggRow = {
    source: string
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    paidCount: number
    pendingCount: number
    periods: string[]
  }

  const aggregated = useMemo<AggRow[]>(() => {
    if (!artistFilter) return []
    const map = new Map<string, AggRow>()
    for (const r of filtered) {
      const source = r.revenue?.source ?? 'unknown'
      if (!map.has(source)) {
        map.set(source, { source, totalAmount: 0, paidAmount: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0, periods: [] })
      }
      const entry = map.get(source)!
      entry.totalAmount += r.amount
      if (r.status === 'PAID')    { entry.paidAmount    += r.amount; entry.paidCount++ }
      if (r.status === 'PENDING') { entry.pendingAmount += r.amount; entry.pendingCount++ }
      if (!entry.periods.includes(r.period)) entry.periods.push(r.period)
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [filtered, artistFilter])

  const columns: Column<RoyaltyRow>[] = [
    {
      key: 'artist',
      header: 'Artist',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {r.artist.photo ? (
            <img src={r.artist.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
              {r.artist.name[0]}
            </div>
          )}
          <span style={{ fontWeight: 500, fontSize: 13 }}>{r.artist.name}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Sumă',
      render: (r) => (
        <strong style={{
          color: r.status === 'PAID' ? '#6ee7b7'
            : r.status === 'CANCELLED' ? 'var(--text-secondary)'
            : '#fde68a',
        }}>
          {r.amount.toFixed(2)} €
        </strong>
      ),
    },
    {
      key: 'period',
      header: 'Perioadă',
      render: (r) => <span style={{ fontSize: 13 }}>{r.period}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'revenue',
      header: 'Venit asociat',
      render: (r) => {
        if (!r.revenue) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
        const confirmed = r.revenue.revenueStatus === 'RECONCILIAT'
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {SOURCE_LABELS[r.revenue.source] ?? r.revenue.source} · {r.revenue.period}
            </span>
            <span style={{ fontSize: 10, color: confirmed ? '#6ee7b7' : '#fde68a' }}>
              {confirmed ? '✓ Confirmat' : '⏳ Estimat'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'paidAt',
      header: 'Plătit la',
      render: (r) => r.paidAt
        ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(r.paidAt).toLocaleDateString('ro-RO')}</span>
        : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => {
        if (r.status === 'PAID') {
          return (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Plătit pe {r.paidAt ? new Date(r.paidAt).toLocaleDateString('ro-RO') : '—'}
            </span>
          )
        }
        if (r.status === 'CANCELLED') return null
        if (r.status === 'PENDING' && canManage) {
          return (
            <form action={cancelRoyaltyAction}>
              <input type="hidden" name="royaltyId" value={r.id} />
              <button
                type="submit"
                title="Anulează (doar pentru corecție erori)"
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(252,165,165,0.45)', cursor: 'pointer' }}
              >
                ✗
              </button>
            </form>
          )
        }
        return null
      },
    },
  ]

  return (
    <>
    {(success || error) && (
      <div style={{
        marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 14,
        background: success ? 'rgba(74,222,128,0.08)' : 'rgba(252,165,165,0.08)',
        border: `1px solid ${success ? 'rgba(74,222,128,0.25)' : 'rgba(252,165,165,0.25)'}`,
        color: success ? '#4ade80' : '#fca5a5',
      }}>
        {success === 'period_paid'
          ? (() => {
              const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
              const period = params.get('period') ?? ''
              const count  = params.get('count')  ?? ''
              return `${count} redevență${Number(count) !== 1 ? 'e' : ''} marcate ca plătite pentru luna ${period}.`
            })()
          : success
            ? 'Plata a fost înregistrată cu succes.'
            : decodeURIComponent(error ?? '')
        }
      </div>
    )}

    {/* ── Luni cu plăți în așteptare ── */}
    {canManage && pendingPeriods.length > 0 && (
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Luni cu redevențe de plătit</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingPeriods.map((p) => (
            <div key={p.period} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{p.period}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {p.count} redevență{p.count !== 1 ? 'e' : ''} · {p.artistCount} artist{p.artistCount !== 1 ? 'i' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fde68a' }}>
                  {p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}k €` : `${p.total.toFixed(2)} €`}
                </span>
                <form action={markPeriodRoyaltiesPaidAction}>
                  <input type="hidden" name="period" value={p.period} />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontSize: 12, height: 32, padding: '0 14px', whiteSpace: 'nowrap' }}
                  >
                    Plătește luna {p.period}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    <div style={{ position: 'relative' }}>
      {/* ── Filtre — în stânga conținutului ── */}
      <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 220, height: '100%' }}>
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{
            background: 'rgba(16,14,28,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(155,148,240,0.10)',
            borderRadius: 14,
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>Filtrează</span>
              {hasFilters && (
                <button type="button" onClick={() => { setArtistFilter(''); setStatusFilter('all'); setPeriodFilter('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}>
                  Resetează
                </button>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 8 }}>Artist</div>
              <select
                className="form-input form-select"
                style={{ fontSize: 13 }}
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
              >
                <option value="">Toți artiștii</option>
                {artistOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 8 }}>Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {STATUS_CHIPS.map((chip) => (
                  <FilterChip
                    key={chip.value}
                    label={chip.label}
                    active={statusFilter === chip.value}
                    onClick={() => setStatusFilter(chip.value)}
                  />
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 8 }}>Perioadă</div>
              <input
                className="form-input"
                style={{ fontSize: 13 }}
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>

            <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '16px -16px 16px' }} />

            <button
              type="button"
              onClick={() => exportCsv(filtered)}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: 12, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', boxSizing: 'border-box', padding: '0 12px' }}
            >
              ↓ Exportă raport{hasFilters ? ' (filtrat)' : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabel ── */}
      {artistFilter && aggregated.length > 0 ? (
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {artistOptions.find(a => a.id === artistFilter)?.name} — redevențe per platformă
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{aggregated.length} platforme</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Platformă', 'Redevențe cuvenite', 'Plătit', 'În așteptare', 'Perioade'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aggregated.map((row) => (
                <tr key={row.source}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 600, fontSize: 13 }}>
                    {SOURCE_LABELS[row.source] ?? row.source}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <strong style={{ color: '#f0efe8' }}>{row.totalAmount.toFixed(2)} €</strong>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.paidCount > 0
                      ? <span style={{ color: '#6ee7b7', fontSize: 13 }}>{row.paidAmount.toFixed(2)} €<span style={{ fontSize: 11, color: 'rgba(110,231,183,0.6)', marginLeft: 4 }}>({row.paidCount})</span></span>
                      : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.pendingCount > 0
                      ? <span style={{ color: '#fde68a', fontSize: 13 }}>{row.pendingAmount.toFixed(2)} €<span style={{ fontSize: 11, color: 'rgba(253,230,138,0.6)', marginLeft: 4 }}>({row.pendingCount})</span></span>
                      : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {row.periods.sort().join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="card">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(r) => r.id}
            pageSize={25}
            emptyState={
              <EmptyState
                icon=""
                title="Nicio plată"
                description={hasFilters ? 'Nicio plată corespunde filtrelor selectate.' : 'Nu există plăți royalty înregistrate.'}
              />
            }
          />
        </section>
      )}
    </div>

    </>
  )
}
