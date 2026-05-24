'use client'

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { markRoyaltyPaidAction, cancelRoyaltyAction } from '@/app/actions/revenues'

export type RoyaltyRow = {
  id: string
  amount: number
  period: string
  status: string
  paidAt: string | null
  notes: string | null
  createdAt: string
  artist: { id: string; name: string; photo: string | null }
  revenue: { id: string; source: string; period: string } | null
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

export function RoyaltiesClient({ royalties, canManage }: { royalties: RoyaltyRow[]; canManage: boolean }) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState('')

  const filtered = useMemo(() => royalties.filter((r) => {
    if (search && !r.artist.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (periodFilter && r.period !== periodFilter.trim()) return false
    return true
  }), [royalties, search, statusFilter, periodFilter])

  const hasFilters = Boolean(search || statusFilter !== 'all' || periodFilter)

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
      render: (r) => r.revenue
        ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{SOURCE_LABELS[r.revenue.source] ?? r.revenue.source} · {r.revenue.period}</span>
        : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>,
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
        if (r.status === 'PENDING' && canManage) {
          return (
            <div style={{ display: 'flex', gap: 6 }}>
              <form action={markRoyaltyPaidAction}>
                <input type="hidden" name="royaltyId" value={r.id} />
                <button
                  type="submit"
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(110,231,183,0.3)', background: 'rgba(110,231,183,0.1)', color: '#6ee7b7', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ✓ Marchează plătit
                </button>
              </form>
              <form action={cancelRoyaltyAction}>
                <input type="hidden" name="royaltyId" value={r.id} />
                <button
                  type="submit"
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(252,165,165,0.3)', background: 'rgba(252,165,165,0.1)', color: '#fca5a5', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ✗ Anulează
                </button>
              </form>
            </div>
          )
        }
        return null
      },
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      {/* Filtre stânga */}
      <aside>
        <div className="card" style={{ padding: '16px 14px' }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Caută artist</label>
            <input
              className="form-input"
              style={{ fontSize: 13 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nume artist..."
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 0 }}>
              Status
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Perioadă (YYYY-MM)</label>
            <input
              className="form-input"
              style={{ fontSize: 13 }}
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              placeholder="ex: 2026-03"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: 12 }}
              onClick={() => { setSearch(''); setStatusFilter('all'); setPeriodFilter('') }}
            >
              × Resetează filtre
            </button>
          )}
        </div>
      </aside>

      {/* Tabel dreapta */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Plăți royalties</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {filtered.length} {filtered.length === 1 ? 'plată' : 'plăți'}
          </span>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          getRowKey={(r) => r.id}
          pageSize={25}
          emptyState={
            <EmptyState
              icon="💰"
              title="Nicio plată"
              description={hasFilters ? 'Nicio plată corespunde filtrelor selectate.' : 'Nu există plăți royalty înregistrate.'}
            />
          }
        />
      </section>
    </div>
  )
}
