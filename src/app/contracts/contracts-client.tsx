'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { FilterBar } from '@/components/ui/FilterBar'
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
  aiAnalysis: string | null
  createdAt: string
  artist: { id: string; name: string; photo: string | null }
}

export type ArtistOption = { id: string; name: string }

type StatusFilter = 'all' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'DRAFT' | 'NEGOTIATION'
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
  DRAFT:       'Draft',
  NEGOTIATION: 'În negociere',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Caută după artist..."
        chips={{
          value: statusFilter,
          activeValue: statusFilter,
          onChange: (v) => setStatusFilter(v as StatusFilter),
          options: [
            { value: 'all',         label: 'Toate' },
            { value: 'ACTIVE',      label: 'Active' },
            { value: 'EXPIRING',    label: 'Expiră' },
            { value: 'EXPIRED',     label: 'Expirate' },
            { value: 'DRAFT',       label: 'Draft' },
            { value: 'NEGOTIATION', label: 'Negociere' },
          ],
        }}
        sortOptions={[
          { value: 'date',    label: 'Sortare: Dată' },
          { value: 'artist',  label: 'Sortare: Artist' },
          { value: 'royalty', label: 'Sortare: Royalty' },
        ]}
        sortValue={sortBy}
        onSortChange={(v) => setSortBy(v as SortKey)}
        suggestions={suggestions}
        resultsCount={filtered.length}
        resultsLabel={filtered.length === 1 ? 'contract' : 'contracte'}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
            + Contract nou
          </button>
        )}
      </div>

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
