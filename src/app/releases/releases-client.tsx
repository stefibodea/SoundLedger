'use client'

import { useState, useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { FilterBar } from '@/components/ui/FilterBar'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { createReleaseAction, updateReleaseStatusAction } from '@/app/actions/releases'
import { generatePressReleaseAction } from '@/app/actions/ai'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ReleaseRow = {
  id: string
  status: string
  releaseDate: string
  pressRelease: string | null
  checklist: string | null
  track: { id: string; title: string; artist: { name: string; photo: string | null } } | null
  album: { id: string; title: string } | null
}

export type TrackOption = { id: string; label: string }

type StatusFilter = 'all' | 'PLANNING' | 'READY' | 'RELEASED'

type Props = {
  releases: ReleaseRow[]
  tracks: TrackOption[]
}

type ChecklistItem = { label: string; done: boolean }

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (!raw) return []
  try { return JSON.parse(raw) as ChecklistItem[] } catch { return [] }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planificare',
  READY:    'Gata de lansare',
  RELEASED: 'Lansat',
}

function releaseStatusVariant(status: string): 'neutral' | 'warning' | 'info' | 'success' {
  if (status === 'RELEASED') return 'success'
  if (status === 'READY')    return 'info'
  return 'neutral'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReleasesClient({ releases, tracks }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen,    setModalOpen]    = useState(false)

  const suggestions = useMemo(() =>
    [...new Set(releases.map((r) =>
      r.track ? `${r.track.artist.name} — ${r.track.title}` : r.album?.title ?? ''
    ).filter(Boolean))],
    [releases],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return releases.filter((r) => {
      const name = r.track
        ? `${r.track.artist.name} ${r.track.title}`.toLowerCase()
        : (r.album?.title ?? '').toLowerCase()
      if (q && !name.includes(q)) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [releases, search, statusFilter])

  const hasActiveFilters = Boolean(search || statusFilter !== 'all')
  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Caută după artist sau piesă..."
        chips={{
          value: statusFilter,
          activeValue: statusFilter,
          onChange: (v) => setStatusFilter(v as StatusFilter),
          options: [
            { value: 'all',      label: 'Toate' },
            { value: 'PLANNING', label: 'Planificare' },
            { value: 'READY',    label: 'Gata' },
            { value: 'RELEASED', label: 'Lansate' },
          ],
        }}
        suggestions={suggestions}
        resultsCount={filtered.length}
        resultsLabel={filtered.length === 1 ? 'lansare' : 'lansări'}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
          + Lansare nouă
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🚀"
            title="Nicio lansare găsită"
            description={
              hasActiveFilters
                ? 'Nicio lansare nu corespunde filtrelor curente.'
                : 'Nu există lansări planificate. Creează prima lansare.'
            }
            action={
              !hasActiveFilters
                ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Lansare nouă</button>
                : <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map((release) => {
            const checklist = parseChecklist(release.checklist)
            const doneCount = checklist.filter((c) => c.done).length
            const name = release.track
              ? `${release.track.artist.name} — ${release.track.title}`
              : release.album?.title ?? 'Lansare'

            return (
              <div key={release.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {release.track?.artist && (
                      <Avatar name={release.track.artist.name} imageUrl={release.track.artist.photo} size={36} />
                    )}
                    <div>
                      <strong style={{ fontSize: 16 }}>{name}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
                        Data lansării: <strong>{fmtDate(release.releaseDate)}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <StatusBadge
                      label={STATUS_LABELS[release.status] ?? release.status}
                      variant={releaseStatusVariant(release.status)}
                    />
                    <form action={updateReleaseStatusAction} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <select
                        name="status"
                        className="form-input form-select"
                        defaultValue={release.status}
                        style={{ padding: '4px 8px', fontSize: 13 }}
                      >
                        <option value="PLANNING">Planificare</option>
                        <option value="READY">Gata de lansare</option>
                        <option value="RELEASED">Lansat</option>
                      </select>
                      <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 12 }}>
                        Actualizează
                      </button>
                    </form>
                  </div>
                </div>

                {checklist.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Checklist: {doneCount}/{checklist.length} finalizate
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {checklist.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={{ color: item.done ? 'var(--role-ar-dark)' : 'var(--text-tertiary)' }}>
                            {item.done ? '✓' : '○'}
                          </span>
                          <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                  {release.pressRelease ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>✦ Press kit</h4>
                        <form action={generatePressReleaseAction}>
                          <input type="hidden" name="releaseId" value={release.id} />
                          <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>Regenerează</button>
                        </form>
                      </div>
                      <pre style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                        {release.pressRelease}
                      </pre>
                    </div>
                  ) : (
                    <form action={generatePressReleaseAction}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <button type="submit" className="btn btn-sm btn-secondary" style={{ fontSize: 12 }}>
                        ✦ Generează press kit cu AI
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lansare nouă"
        description="Selectează piesa și data de lansare. Poți adăuga checklist și press kit ulterior."
        size="md"
      >
        <form action={createReleaseAction}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" htmlFor="m-trackId">Piesă *</label>
            <select id="m-trackId" name="trackId" className="form-input form-select" required>
              <option value="">Selectează piesă</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="m-releaseDate">Data lansării *</label>
            <input id="m-releaseDate" name="releaseDate" className="form-input" type="date" required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Adaugă lansare</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
