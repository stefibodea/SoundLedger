'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, Circle, ArrowUpDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, contractStatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ContractRow = {
  id: string
  status: string
  royaltyPercent: number
  advance: number | null
  duration: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  artist: { id: string; name: string; photo: string | null }
}

type StatusFilter = 'all' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'
type SortKey      = 'artist' | 'date' | 'royalty'

type Props = {
  contracts: ContractRow[]
  canManage: boolean
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:      'Activ',
  EXPIRING:    'Expiră curând',
  EXPIRED:     'Expirat',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── FilterSection collapsible ─────────────────────────────────────────────────

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)',
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContractsClient({ contracts, canManage }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = contracts.filter((c) => {
      if (q && !c.artist.name.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'artist')  return a.artist.name.localeCompare(b.artist.name, 'ro')
      if (sortBy === 'royalty') return b.royaltyPercent - a.royaltyPercent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [contracts, search, statusFilter, sortBy])

  const hasActiveFilters = Boolean(search || statusFilter !== 'all')
  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  // ── Coloane tabel ────────────────────────────────────────────────────────

  const columns: Column<ContractRow>[] = [
    {
      key: 'artist',
      header: 'Artist',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={c.artist.name} imageUrl={c.artist.photo} size={32} />
          <Link href={`/artists/${c.artist.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
            {c.artist.name}
          </Link>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (c) => (
        <StatusBadge
          label={STATUS_LABELS[c.status] ?? c.status}
          variant={contractStatusVariant(c.status)}
        />
      ),
    },
    {
      key: 'royalty',
      header: 'Royalty',
      width: '80px',
      render: (c) => (
        <span style={{ fontWeight: 600, fontSize: 14 }}>{c.royaltyPercent}%</span>
      ),
    },
    {
      key: 'advance',
      header: 'Avans',
      width: '100px',
      render: (c) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {c.advance != null ? `${c.advance.toLocaleString('ro-RO')} €` : '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Durată',
      width: '100px',
      render: (c) => <span style={{ fontSize: 13 }}>{c.duration}</span>,
    },
    {
      key: 'period',
      header: 'Perioadă',
      width: '200px',
      render: (c) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {fmtDate(c.startDate)} {fmtDate(c.endDate)}
        </span>
      ),
    },
    {
      key: 'detalii',
      header: 'Detalii',
      width: '100px',
      render: (c) => (
        <Link href={`/contracts/${c.id}`} className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>
          Vezi
        </Link>
      ),
    },
    {
      key: 'date',
      header: 'Creat',
      width: '95px',
      render: (c) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(c.createdAt)}</span>,
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

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
        .cat-filter-chip {
          padding: 4px 10px; border-radius: 6px; font-size: 11px;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.05);
          color: #d4d2c8; font-weight: 400;
        }
        .cat-filter-chip:hover { background: rgba(255,255,255,0.09); color: #f0efe8; }
        .cat-filter-chip.active {
          background: rgba(155,148,240,0.18); border-color: rgba(155,148,240,0.45);
          color: #9B94F0; font-weight: 600;
        }
      `}</style>

      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre: absolute în stânga conținutului ──────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 220, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'rgba(16,14,28,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(155,148,240,0.10)', borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>Filtrează</span>
                {hasActiveFilters && (
                  <button type='button' onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}>Resetează</button>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Caută</FilterLabel>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,198,188,0.4)', pointerEvents: 'none', zIndex: 1 }} />
                  <input className='filter-search-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Caută după artist...' style={{ height: 36 }} />
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Status</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {([
                    { value: 'all',      label: 'Toate' },
                    { value: 'ACTIVE',   label: 'Active' },
                    { value: 'EXPIRING', label: 'Expiră' },
                    { value: 'EXPIRED',  label: 'Expirate' },
                  ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => {
                    const active = statusFilter === value
                    return (
                      <button key={value} type='button' onClick={() => setStatusFilter(value)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400, background: active ? 'rgba(155,148,240,0.18)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(155,148,240,0.40)' : '1px solid rgba(255,255,255,0.07)', color: active ? '#9B94F0' : 'var(--text-primary)', boxShadow: active ? '0 0 8px rgba(155,148,240,0.15)' : 'none', transition: 'all 0.15s ease' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
              <div>
                <FilterLabel>Sortare</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {([
                    { value: 'date',    label: 'Dată' },
                    { value: 'artist',  label: 'Artist' },
                    { value: 'royalty', label: 'Royalty %' },
                  ] as { value: SortKey; label: string }[]).map((opt) => (
                    <button key={opt.value} type='button'
                      onClick={() => setSortBy(opt.value)}
                      className={`cat-filter-chip${sortBy === opt.value ? ' active' : ''}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ── Conținut ────────────────────────────────────────────────── */}

          <section className="card">
            <DataTable
              data={filtered}
              columns={columns}
              getRowKey={(c) => c.id}
              pageSize={25}
              emptyState={
                <EmptyState
                  icon=""
                  title="Niciun contract găsit"
                  description={
                    hasActiveFilters
                      ? 'Niciun contract nu corespunde filtrelor curente.'
                      : 'Nu există contracte înregistrate încă.'
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

      </div>

    </>
  )
}