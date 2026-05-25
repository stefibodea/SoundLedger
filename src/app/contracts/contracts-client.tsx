'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, Circle, ArrowUpDown, ChevronDown } from 'lucide-react'
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
      `}</style>

      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre: absolute în stânga conținutului ──────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>

            <FilterSection label="Caută" icon={<Search size={11} />}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input className="filter-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută după artist..." />
              </div>
            </FilterSection>

            <FilterSection label="Status" icon={<Circle size={11} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([
                  { value: 'all',      label: 'Toate' },
                  { value: 'ACTIVE',   label: 'Active' },
                  { value: 'EXPIRING', label: 'Expiră' },
                  { value: 'EXPIRED',  label: 'Expirate' },
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

            <FilterSection label="Sortare" icon={<ArrowUpDown size={11} />}>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={{
                width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', padding: '8px 28px 8px 12px',
                fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit',
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}>
                <option value="date">Dată creare</option>
                <option value="artist">Artist</option>
                <option value="royalty">Royalty %</option>
              </select>
            </FilterSection>

            <div style={{ borderTop: hasActiveFilters ? '1px solid rgba(255,255,255,0.05)' : 'none', marginTop: hasActiveFilters ? 20 : 0, paddingTop: hasActiveFilters ? 14 : 0 }}>
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
