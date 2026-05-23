'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, ListFilter, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
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
  createdAt: string
}

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

export function ARClient({ prospects }: Props) {
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


      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre: absolute în stânga conținutului ──────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>Filtre</p>

            <FilterSection label="Caută" icon={<Search size={11} />}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input className="filter-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nume sau note..." />
              </div>
            </FilterSection>

            <FilterSection label="Etapă pipeline" icon={<ListFilter size={11} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([
                  { value: 'all',         label: 'Toate' },
                  { value: 'IDENTIFIED',  label: 'Identificat' },
                  { value: 'ANALYZING',   label: 'Analiză' },
                  { value: 'CONTACTED',   label: 'Contactat' },
                  { value: 'NEGOTIATION', label: 'Negociere' },
                  { value: 'SIGNED',      label: 'Semnat' },
                  { value: 'REJECTED',    label: 'Respins' },
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
                <option value="date">Dată adăugare</option>
                <option value="name">Nume</option>
                <option value="score">Scor AI</option>
              </select>
            </FilterSection>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 20, paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: hasActiveFilters ? 8 : 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filtered.length}</span>
                {' '}{filtered.length === 1 ? 'candidat' : 'candidați'}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
              + Adaugă candidat
            </button>
          </div>

          {/* ── Kanban ─────────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
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
      }

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
