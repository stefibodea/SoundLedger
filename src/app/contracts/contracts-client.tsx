'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, Circle, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, contractStatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { createContractAction } from '@/app/actions/contracts'

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

export type ArtistOption = { id: string; name: string }

type StatusFilter = 'all' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'
type SortKey      = 'artist' | 'date' | 'royalty'

type Props = {
  contracts: ContractRow[]
  artists: ArtistOption[]
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

export function ContractsClient({ contracts, artists, canManage }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')
  const [modalOpen,    setModalOpen]    = useState(false)

  const suggestions = useMemo(() =>
    [...new Set(contracts.map((c) => c.artist.name))],
    [contracts],
  )

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
          {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
        </span>
      ),
    },
    {
      key: 'detalii',
      header: 'Detalii',
      width: '100px',
      render: (c) => (
        <Link href={`/contracts/${c.id}`} className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>
          Vezi →
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
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>Filtre</p>

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

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 20, paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: hasActiveFilters ? 8 : 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filtered.length}</span>
                {' '}{filtered.length === 1 ? 'contract' : 'contracte'}
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
          {canManage && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
                + Contract nou
              </button>
            </div>
          )}

          <section className="card">
            <DataTable
              data={filtered}
              columns={columns}
              getRowKey={(c) => c.id}
              pageSize={25}
              emptyState={
                <EmptyState
                  icon="📄"
                  title="Niciun contract găsit"
                  description={
                    hasActiveFilters
                      ? 'Niciun contract nu corespunde filtrelor curente.'
                      : 'Nu există contracte înregistrate încă.'
                  }
                  action={
                    canManage && !hasActiveFilters
                      ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Contract nou</button>
                      : hasActiveFilters
                      ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                      : undefined
                  }
                />
              }
            />
          </section>

      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Contract nou"
        description="Completează detaliile contractului. Poți edita clauzele și analiza AI ulterior."
        size="lg"
      >
        <form action={createContractAction}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-artistId">Artist *</label>
              <select id="m-artistId" name="artistId" className="form-input form-select" required>
                <option value="">Selectează artist</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-duration">Durată *</label>
              <input id="m-duration" name="duration" className="form-input" placeholder="ex: 2 ani" required />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-royaltyPercent">Royalty %</label>
              <input id="m-royaltyPercent" name="royaltyPercent" className="form-input" type="number" step="0.1" min="0" max="100" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-advance">Avans (€, opțional)</label>
              <input id="m-advance" name="advance" className="form-input" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-startDate">Data început</label>
              <input id="m-startDate" name="startDate" className="form-input" type="date" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-endDate">Data final</label>
              <input id="m-endDate" name="endDate" className="form-input" type="date" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-status">Status</label>
              <select id="m-status" name="status" className="form-input form-select">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Activ</option>
                <option value="NEGOTIATION">În negociere</option>
                <option value="EXPIRING">Expiră curând</option>
                <option value="EXPIRED">Expirat</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-signedAt">Semnat la (opțional)</label>
              <input id="m-signedAt" name="signedAt" className="form-input" type="date" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" htmlFor="m-documentUrl">URL document (opțional)</label>
            <input id="m-documentUrl" name="documentUrl" className="form-input" type="url" placeholder="https://..." />
          </div>

          {/* Teritorii */}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Teritorii (opțional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {['România', 'Europa', 'Mondial', 'SUA', 'UK', 'Asia'].map((t) => (
                <label key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid var(--border-light)', fontSize: 13,
                  userSelect: 'none',
                }}>
                  <input type="checkbox" name="territories" value={t}
                    style={{ accentColor: 'var(--primary)', width: 13, height: 13 }} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Drepturi */}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Drepturi (opțional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {['Streaming', 'Distribuție digitală', 'Radio', 'Sincronizare', 'Licențiere'].map((r) => (
                <label key={r} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid var(--border-light)', fontSize: 13,
                  userSelect: 'none',
                }}>
                  <input type="checkbox" name="rights" value={r}
                    style={{ accentColor: 'var(--primary)', width: 13, height: 13 }} />
                  {r}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="m-specialClauses">Clauze speciale (opțional)</label>
            <textarea id="m-specialClauses" name="specialClauses" className="form-input form-textarea" rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Salvează contract</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
