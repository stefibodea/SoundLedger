'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { FilterBar } from '@/components/ui/FilterBar'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, prospectStatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { createProspectAction, moveProspectAction } from '@/app/actions/ar'
import { generateProspectAIScoreAction } from '@/app/actions/ai'

// ── AI Score Button — fără form în td ─────────────────────────────────────────

function AIScoreButton({ prospectId }: { prospectId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      className="btn btn-sm btn-secondary"
      style={{ fontSize: 11, opacity: isPending ? 0.6 : 1 }}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData()
          fd.append('prospectId', prospectId)
          await generateProspectAIScoreAction(fd)
        })
      }}
    >
      {isPending ? '…' : '✦ Analizează'}
    </button>
  )
}

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ProspectRow = {
  id: string
  name: string
  status: string
  aiScore: number | null
  notes: string | null
  instagram: string | null
  spotifyUrl: string | null
  youtubeUrl: string | null
  createdAt: string
}

type ViewMode    = 'kanban' | 'table'
type StatusFilter = 'all' | 'IDENTIFIED' | 'ANALYZING' | 'CONTACTED' | 'NEGOTIATION' | 'SIGNED' | 'REJECTED'
type SortKey     = 'date' | 'name' | 'score'

type Props = {
  prospects: ProspectRow[]
}

const COLUMNS: { key: string; label: string; headerBg: string; bodyBg: string; textColor: string; borderColor: string }[] = [
  { key: 'IDENTIFIED',  label: 'Identificat', headerBg: 'rgba(100,100,130,0.35)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#a8a6bc', borderColor: 'rgba(100,100,130,0.25)' },
  { key: 'ANALYZING',   label: 'În analiză',  headerBg: 'rgba(147,197,253,0.18)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#93c5fd', borderColor: 'rgba(147,197,253,0.2)'  },
  { key: 'CONTACTED',   label: 'Contactat',   headerBg: 'rgba(253,230,138,0.18)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#fde68a', borderColor: 'rgba(253,230,138,0.2)'  },
  { key: 'NEGOTIATION', label: 'Negociere',   headerBg: 'rgba(155,148,240,0.22)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#c4bef8', borderColor: 'rgba(155,148,240,0.25)' },
  { key: 'SIGNED',      label: 'Semnat',      headerBg: 'rgba(22,101,52,0.55)',     bodyBg: 'rgba(16,46,30,0.6)',    textColor: '#6ee7b7', borderColor: 'rgba(110,231,183,0.25)' },
  { key: 'REJECTED',    label: 'Respins',     headerBg: 'rgba(252,165,165,0.15)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#fca5a5', borderColor: 'rgba(252,165,165,0.2)'  },
]
const STATUS_ORDER = ['IDENTIFIED', 'ANALYZING', 'CONTACTED', 'NEGOTIATION', 'SIGNED', 'REJECTED']
const STATUS_LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ARClient({ prospects }: Props) {
  const [viewMode,     setViewMode]     = useState<ViewMode>('kanban')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')
  const [modalOpen,    setModalOpen]    = useState(false)

  const suggestions = useMemo(() =>
    [...new Set(prospects.map((p) => p.name))],
    [prospects],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = prospects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.notes?.toLowerCase().includes(q) ?? false)) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'name')  return a.name.localeCompare(b.name, 'ro')
      if (sortBy === 'score') return (b.aiScore ?? -1) - (a.aiScore ?? -1)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [prospects, search, statusFilter, sortBy])

  const hasActiveFilters = Boolean(search || statusFilter !== 'all')
  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  // ── Coloane tabel ────────────────────────────────────────────────────────

  const columns: Column<ProspectRow>[] = [
    {
      key: 'name',
      header: 'Candidat',
      render: (p) => (
        <Link href={`/ar/${p.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
          {p.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Etapă',
      width: '140px',
      render: (p) => (
        <StatusBadge label={STATUS_LABELS[p.status] ?? p.status} variant={prospectStatusVariant(p.status)} />
      ),
    },
    {
      key: 'score',
      header: 'Scor AI',
      width: '120px',
      render: (p) => {
        const s = p.aiScore
        if (s == null) {
          return <AIScoreButton prospectId={p.id} />
        }
        const color = s >= 70 ? 'var(--role-ar-dark)' : s >= 40 ? 'var(--role-finance-dark)' : 'var(--text-secondary)'
        return <span style={{ fontWeight: 700, color, fontSize: 14 }}>{s}/100</span>
      },
    },
    {
      key: 'notes',
      header: 'Note',
      render: (p) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {p.notes ? (p.notes.length > 60 ? p.notes.slice(0, 60) + '…' : p.notes) : '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Adăugat',
      width: '95px',
      render: (p) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (p) => (
        <Link href={`/ar/${p.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
          Detalii →
        </Link>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .kanban-card { position: relative; transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .kanban-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.15) !important; }
        .kanban-card .card-actions { opacity: 0; transition: opacity 0.18s ease; }
        .kanban-card:hover .card-actions { opacity: 1; }
        .kanban-col-header {
          border-radius: 10px 10px 0 0;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 13px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .kanban-col-body {
          border-top: none;
          border-radius: 0 0 10px 10px;
          padding: 10px;
          min-height: 120px;
          display: grid;
          gap: 8px;
          align-content: start;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .score-bar-track { background: var(--border-light); border-radius: 3px; height: 4px; overflow: hidden; }
        .score-bar-fill  { height: 4px; border-radius: 3px; transition: width 0.4s ease; }
      `}</style>

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Caută după nume sau note..."
        chips={{
          value: statusFilter,
          activeValue: statusFilter,
          onChange: (v) => setStatusFilter(v as StatusFilter),
          options: [
            { value: 'all',         label: 'Toate' },
            { value: 'IDENTIFIED',  label: 'Identificat' },
            { value: 'ANALYZING',   label: 'În analiză' },
            { value: 'CONTACTED',   label: 'Contactat' },
            { value: 'NEGOTIATION', label: 'Negociere' },
            { value: 'SIGNED',      label: 'Semnat' },
            { value: 'REJECTED',    label: 'Respins' },
          ],
        }}
        sortOptions={[
          { value: 'date',  label: 'Sortare: Dată' },
          { value: 'name',  label: 'Sortare: Nume' },
          { value: 'score', label: 'Sortare: Scor AI' },
        ]}
        sortValue={sortBy}
        onSortChange={(v) => setSortBy(v as SortKey)}
        suggestions={suggestions}
        resultsCount={filtered.length}
        resultsLabel={filtered.length === 1 ? 'candidat' : 'candidați'}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      {/* View toggle + buton adăugare */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className={viewMode === 'kanban' ? 'btn btn-secondary' : 'btn btn-ghost'}
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setViewMode('kanban')}
            aria-pressed={viewMode === 'kanban'}
          >
            🗂️ Kanban
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'btn btn-secondary' : 'btn btn-ghost'}
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            📋 Tabel
          </button>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
          + Adaugă candidat
        </button>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🎤"
              title="Niciun candidat găsit"
              description={hasActiveFilters ? 'Niciun candidat nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun candidat în pipeline.'}
              action={
                !hasActiveFilters
                  ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Adaugă primul candidat</button>
                  : <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
              }
            />
          </div>
        ) : (
          <div className="kanban-scroll-container">
            {COLUMNS.map((col) => {
              const items = filtered.filter((p) => p.status === col.key)
              const currentIdx = STATUS_ORDER.indexOf(col.key)
              const nextStatus = STATUS_ORDER[currentIdx + 1]
              const prevStatus = STATUS_ORDER[currentIdx - 1]

              return (
                <div key={col.key} style={{ minWidth: 260, maxWidth: 260, flexShrink: 0 }}>
                  {/* Header coloană */}
                  <div
                    className="kanban-col-header"
                    style={{
                      background: col.headerBg, border: `1px solid ${col.borderColor}`, borderBottom: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px',
                    }}
                  >
                    <span style={{ color: col.textColor, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col.label}
                    </span>
                    <span style={{
                      background: 'rgba(255,255,255,0.08)', borderRadius: 20,
                      padding: '2px 8px', fontSize: 12, color: col.textColor,
                    }}>
                      {items.length}
                    </span>
                  </div>

                  {/* Body coloană */}
                  <div
                    className="kanban-col-body"
                    style={{ background: col.bodyBg, border: `1px solid ${col.borderColor}`, minHeight: 'calc(100vh - 280px)' }}
                  >
                    {items.length === 0 ? (
                      <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>—</p>
                    ) : (
                      items.map((prospect) => {
                        const score = prospect.aiScore
                        const scoreColor = score == null ? null
                          : score >= 70 ? { bg: 'var(--role-ar-light)', fg: 'var(--role-ar-dark)' }
                          : score >= 40 ? { bg: 'var(--role-finance-light)', fg: 'var(--role-finance-dark)' }
                          : { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)' }

                        return (
                          <div
                            key={prospect.id}
                            className="kanban-card"
                            style={{
                              padding: 14, marginBottom: 10, borderRadius: 10,
                              background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
                              <strong style={{ fontSize: 14, fontWeight: 600 }}>{prospect.name}</strong>
                              <Link href={`/ar/${prospect.id}`} style={{ fontSize: 11, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                detalii →
                              </Link>
                            </div>

                            {prospect.notes && (
                              <p style={{
                                color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 8px',
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}>
                                {prospect.notes}
                              </p>
                            )}

                            {prospect.spotifyUrl && (
                              <a href={prospect.spotifyUrl} target="_blank" rel="noopener noreferrer"
                                style={{
                                  display: 'inline-block', fontSize: 11, marginBottom: 8,
                                  padding: '2px 8px', borderRadius: 999,
                                  background: 'rgba(30,215,96,0.12)', color: '#1ed760',
                                  border: '1px solid rgba(30,215,96,0.25)', textDecoration: 'none',
                                }}>
                                🎵 Spotify
                              </a>
                            )}

                            {score != null ? (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor?.fg }}>✦ {score}/100</span>
                                  <span style={{ fontSize: 10, color: scoreColor?.fg, background: scoreColor?.bg, padding: '2px 7px', borderRadius: 8 }}>
                                    {score >= 70 ? 'ridicat' : score >= 40 ? 'mediu' : 'scăzut'}
                                  </span>
                                </div>
                                <div className="score-bar-track">
                                  <div
                                    className="score-bar-fill"
                                    style={{
                                      width: `${score}%`,
                                      background: score >= 80 ? '#22d3ee' : score < 50 ? '#ff7b7b' : '#facc15',
                                      boxShadow: score >= 80
                                        ? '0 0 8px rgba(34,211,238,0.7), 0 0 16px rgba(34,211,238,0.35)'
                                        : score < 50
                                        ? '0 0 8px rgba(255,123,123,0.7), 0 0 16px rgba(255,123,123,0.35)'
                                        : '0 0 8px rgba(250,204,21,0.6), 0 0 14px rgba(250,204,21,0.3)',
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <form action={generateProspectAIScoreAction} style={{ marginBottom: 8 }}>
                                <input type="hidden" name="prospectId" value={prospect.id} />
                                <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}>
                                  ✦ Analizează
                                </button>
                              </form>
                            )}

                            <div className="card-actions" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {prevStatus && (
                                <form action={moveProspectAction}>
                                  <input type="hidden" name="id" value={prospect.id} />
                                  <input type="hidden" name="status" value={prevStatus} />
                                  <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }}>←</button>
                                </form>
                              )}
                              {prospect.status === 'SIGNED' ? (
                                <Link
                                  href={`/ar/${prospect.id}`}
                                  className="btn btn-sm"
                                  style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', borderRadius: 6 }}
                                >
                                  + Artist →
                                </Link>
                              ) : nextStatus ? (
                                <form action={moveProspectAction}>
                                  <input type="hidden" name="id" value={prospect.id} />
                                  <input type="hidden" name="status" value={nextStatus} />
                                  <button type="submit" className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '2px 8px' }}>→</button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Tabel ──────────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <section className="card">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(p) => p.id}
            pageSize={25}
            emptyState={
              <EmptyState
                icon="🎤"
                title="Niciun candidat găsit"
                description={hasActiveFilters ? 'Niciun candidat nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun candidat.'}
                action={
                  hasActiveFilters
                    ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                    : <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Adaugă primul candidat</button>
                }
              />
            }
          />
        </section>
      )}

      {/* Modal adăugare candidat */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adaugă candidat nou"
        description="Completează informațiile de bază. Poți adăuga detalii și genera scor AI ulterior."
        size="lg"
      >
        <form action={createProspectAction}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-name">Nume artist *</label>
              <input id="m-name" name="name" className="form-input" required autoFocus placeholder="ex. Maria Ionescu" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-instagram">Instagram</label>
              <input id="m-instagram" name="instagram" className="form-input" placeholder="@username" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-spotifyUrl">Spotify URL</label>
              <input id="m-spotifyUrl" name="spotifyUrl" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-youtubeUrl">YouTube URL</label>
              <input id="m-youtubeUrl" name="youtubeUrl" className="form-input" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="m-notes">Note</label>
            <textarea id="m-notes" name="notes" className="form-input form-textarea" rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Adaugă în pipeline</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
