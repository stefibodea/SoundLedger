'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, ListFilter, ArrowUpDown } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { createProspectAction, moveProspectAction } from '@/app/actions/ar'
import { generateProspectAIScoreAction } from '@/app/actions/ai'

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
  source: string | null
  createdAt: string
}

type StatusFilter = 'all' | 'ANALYZING' | 'CONTACTED' | 'NEGOTIATION' | 'SIGNED' | 'REJECTED'
type SortKey     = 'date' | 'name' | 'score'

type Props = {
  prospects: ProspectRow[]
}

const COLUMNS: { key: string; label: string; headerBg: string; bodyBg: string; textColor: string; borderColor: string }[] = [
  { key: 'ANALYZING',   label: 'În analiză',  headerBg: 'rgba(147,197,253,0.18)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#93c5fd', borderColor: 'rgba(147,197,253,0.2)'  },
  { key: 'CONTACTED',   label: 'Contactat',   headerBg: 'rgba(253,230,138,0.18)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#fde68a', borderColor: 'rgba(253,230,138,0.2)'  },
  { key: 'NEGOTIATION', label: 'Negociere',   headerBg: 'rgba(155,148,240,0.22)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#c4bef8', borderColor: 'rgba(155,148,240,0.25)' },
  { key: 'SIGNED',      label: 'De semnat',   headerBg: 'rgba(22,101,52,0.55)',     bodyBg: 'rgba(16,46,30,0.6)',    textColor: '#6ee7b7', borderColor: 'rgba(110,231,183,0.25)' },
  { key: 'REJECTED',    label: 'Respins',     headerBg: 'rgba(252,165,165,0.15)',   bodyBg: 'rgba(28,27,34,0.55)',   textColor: '#fca5a5', borderColor: 'rgba(252,165,165,0.2)'  },
]

const STATUS_LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]))

// Tranziția principală forward pentru fiecare status
const NEXT_STATUS: Record<string, string | null> = {
  ANALYZING:   'CONTACTED',
  CONTACTED:   'NEGOTIATION',
  NEGOTIATION: 'SIGNED',
  SIGNED:      null,
  REJECTED:    null,
}

const SOURCE_OPTIONS = [
  'Spotify',
  'YouTube',
  'Instagram',
  'TikTok',
  'SoundCloud',
  'Recomandare',
  'Demo primit prin email',
  'Live / Concert',
  'Altele',
]

function fmtDate(iso: string) {
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

// ── SourceSelect — dropdown + câmp text pentru "Altele" ──────────────────────

function SourceSelect({ defaultValue }: { defaultValue?: string | null }) {
  const isCustom = defaultValue != null && !SOURCE_OPTIONS.slice(0, -1).includes(defaultValue)
  const [selected, setSelected] = useState(isCustom ? 'Altele' : (defaultValue ?? ''))
  const [custom, setCustom] = useState(isCustom ? (defaultValue ?? '') : '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        name="sourceOption"
        className="form-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        required
      >
        <option value="" disabled>Selectează sursa...</option>
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {selected === 'Altele' && (
        <input
          name="sourceCustom"
          className="form-input"
          placeholder="Descrie sursa..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          required
        />
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ARClient({ prospects }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [viewMode,     setViewMode]     = useState<'kanban' | 'tabel'>('kanban')

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

  const tableColumns: Column<ProspectRow>[] = [
    {
      key: 'name',
      header: 'Artist',
      render: (p) => (
        <Link href={`/ar/${p.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
          {p.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (p) => {
        const col = COLUMNS.find((c) => c.key === p.status)
        return (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: col ? col.headerBg : 'rgba(255,255,255,0.05)', color: col ? col.textColor : 'var(--text-secondary)', border: col ? `1px solid ${col.borderColor}` : '1px solid rgba(255,255,255,0.08)' }}>
            {STATUS_LABELS[p.status] ?? p.status}
          </span>
        )
      },
    },
    {
      key: 'score',
      header: 'Scor AI',
      width: '110px',
      render: (p) => {
        if (p.aiScore == null) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>—</span>
        const color = p.aiScore >= 70 ? '#22d3ee' : p.aiScore >= 40 ? '#facc15' : '#ff7b7b'
        return (
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{p.aiScore}/100</span>
            <div className="score-bar-track" style={{ marginTop: 4 }}>
              <div className="score-bar-fill" style={{ width: `${p.aiScore}%`, background: color }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'source',
      header: 'Sursă',
      width: '130px',
      render: (p) => p.source
        ? <span className="badge">{p.source}</span>
        : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>,
    },
    {
      key: 'notes',
      header: 'Note',
      render: (p) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
          {p.notes ?? '—'}
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
      key: 'link',
      header: '',
      width: '80px',
      render: (p) => (
        <Link href={`/ar/${p.id}`} className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>
          Detalii
        </Link>
      ),
    },
  ]

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

      {/* ── Page header: titlu + toggle + buton ──────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>A&R Scouting</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
            {([
              { id: 'kanban', label: 'Pipeline' },
              { id: 'tabel',  label: 'Tabel' },
            ] as const).map((mode) => (
              <button key={mode.id} type="button" onClick={() => setViewMode(mode.id)}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: viewMode === mode.id ? 'var(--bg-secondary)' : 'transparent',
                  color: viewMode === mode.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: viewMode === mode.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
            + Adaugă candidat
          </button>
        </div>
      </div>

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
                  <input className='filter-search-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Nume sau note...' style={{ height: 36 }} />
                </div>
              </div>
              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Etapă pipeline</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {([
                    { value: 'all',         label: 'Toate' },
                    { value: 'ANALYZING',   label: 'Analiză' },
                    { value: 'CONTACTED',   label: 'Contactat' },
                    { value: 'NEGOTIATION', label: 'Negociere' },
                    { value: 'SIGNED',      label: 'De semnat' },
                    { value: 'REJECTED',    label: 'Respins' },
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
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className='cat-sidebar-select'>
                  <option value='date'>Dată adăugare</option>
                  <option value='name'>Nume</option>
                  <option value='score'>Scor AI</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* ── Conținut ────────────────────────────────────────────────── */}

        {viewMode === 'kanban' ? (
          filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon=""
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

              return (
                <div key={col.key} style={{ minWidth: 0 }}>
                  {/* Header coloană */}
                  <div
                    className="kanban-col-header"
                    style={{
                      background: col.headerBg, border: `1px solid ${col.borderColor}`, borderBottom: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 10px',
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
                    style={{ background: col.bodyBg, border: `1px solid ${col.borderColor}`, minHeight: 'calc(100vh - 280px)', padding: 8 }}
                  >
                    {items.length === 0 ? (
                      <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>—</p>
                    ) : (
                      items.map((prospect) => {
                        const score = prospect.aiScore
                        const scoreColor = score == null ? null
                          : score >= 70 ? { bar: '#22d3ee', shadow: 'rgba(34,211,238,0.7)' }
                          : score >= 40 ? { bar: '#facc15', shadow: 'rgba(250,204,21,0.6)' }
                          : { bar: '#ff7b7b', shadow: 'rgba(255,123,123,0.7)' }

                        const mainNext = NEXT_STATUS[prospect.status]
                        const canReject = prospect.status === 'NEGOTIATION'

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
                                detalii
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
                                 Spotify
                              </a>
                            )}

                            {score != null ? (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor?.bar }}>{score}/100</span>
                                </div>
                                <div className="score-bar-track">
                                  <div
                                    className="score-bar-fill"
                                    style={{
                                      width: `${score}%`,
                                      background: scoreColor?.bar,
                                      boxShadow: `0 0 8px ${scoreColor?.shadow}, 0 0 16px ${scoreColor?.shadow}`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <form action={generateProspectAIScoreAction} style={{ marginBottom: 8 }}>
                                <input type="hidden" name="prospectId" value={prospect.id} />
                                <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}>
                                  Analizează
                                </button>
                              </form>
                            )}

                            <div className="card-actions" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {prospect.status === 'SIGNED' ? (
                                <Link
                                  href={`/ar/${prospect.id}`}
                                  className="btn btn-sm"
                                  style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', borderRadius: 6 }}
                                >
                                  + Artist
                                </Link>
                              ) : mainNext ? (
                                <form action={moveProspectAction}>
                                  <input type="hidden" name="id" value={prospect.id} />
                                  <input type="hidden" name="status" value={mainNext} />
                                  <button type="submit" className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '2px 8px' }}>
                                    {STATUS_LABELS[mainNext]}
                                  </button>
                                </form>
                              ) : null}

                              {canReject && (
                                <form action={moveProspectAction}>
                                  <input type="hidden" name="id" value={prospect.id} />
                                  <input type="hidden" name="status" value="REJECTED" />
                                  <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '2px 8px', color: '#fca5a5', borderColor: 'rgba(252,165,165,0.4)' }}>
                                    ✗ Respinge
                                  </button>
                                </form>
                              )}
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
        ) : (
          <section className="card">
            <DataTable
              data={filtered}
              columns={tableColumns}
              getRowKey={(p) => p.id}
              pageSize={25}
              emptyState={
                <EmptyState
                  icon=""
                  title="Niciun candidat găsit"
                  description={hasActiveFilters ? 'Niciun candidat nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun candidat în pipeline.'}
                  action={
                    !hasActiveFilters
                      ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Adaugă primul candidat</button>
                      : <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                  }
                />
              }
            />
          </section>
        )}

      </div>{/* end relative */}

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
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Unde a fost identificat *</label>
            <SourceSelect />
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
            <label className="form-label" htmlFor="m-notes">Note (analiză)</label>
            <textarea id="m-notes" name="notes" className="form-input form-textarea" rows={3} placeholder="Observații despre potențialul artistului..." />
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