'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { Search, Circle, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { createReleaseAction, updateReleaseAction } from '@/app/actions/releases'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ReleaseRow = {
  id: string
  status: string
  releaseDate: string
  checklist: string | null
  track: { id: string; title: string; artist: { name: string; photo: string | null } } | null
  album: { id: string; title: string } | null
}

export type TrackOption = { id: string; label: string }

type ChecklistItem = { label: string; done: boolean }
type StatusFilter  = 'all' | 'PLANNING' | 'READY' | 'RELEASED'

type Props = {
  releases: ReleaseRow[]
  tracks:   TrackOption[]
}

// ── Constante ──────────────────────────────────────────────────────────────────

const MONTH_NAMES  = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
const MONTH_SHORT  = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES    = ['L','M','M','J','V','S','D']

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planificare',
  READY:    'Gata de lansare',
  RELEASED: 'Lansat',
}

const STATUS_MUSIC_ICON: Record<string, string> = {
  RELEASED: '♫',
  READY:    '♪',
  PLANNING: '♩',
}

const STATUS_COLORS: Record<string, { chipBg: string; chipColor: string; bar: string }> = {
  RELEASED: { chipBg: 'rgba(110,231,183,0.15)', chipColor: '#6ee7b7', bar: '#6ee7b7' },
  READY:    { chipBg: 'rgba(253,230,138,0.15)', chipColor: '#fde68a', bar: '#fde68a' },
  PLANNING: { chipBg: 'rgba(155,148,240,0.15)', chipColor: '#9B94F0', bar: '#9B94F0' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseChecklist(raw: string | null): ChecklistItem[] {
  if (!raw) return []
  try { return JSON.parse(raw) as ChecklistItem[] } catch { return [] }
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`
}

function releaseName(r: ReleaseRow): string {
  if (r.track) return `${r.track.artist.name} — ${r.track.title}`
  return r.album?.title ?? 'Lansare'
}

function matchesDay(releaseDate: string, cell: Date): boolean {
  const parts = releaseDate.split('-').map(Number)
  if (parts.length !== 3) return false
  const [y, m, d] = parts
  return y === cell.getFullYear() && m === cell.getMonth() + 1 && d === cell.getDate()
}

function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1)
  // Mon-based: Mon=0 … Sun=6
  let firstDow = firstDay.getDay()
  firstDow = firstDow === 0 ? 6 : firstDow - 1

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = firstDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
  }
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const remainder = days.length % 7
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
    }
  }
  return days
}

function getDaysDiff(dateStr: string): number {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3) return 0
  const [y, m, d] = parts
  const release = new Date(y, m - 1, d)
  const today   = new Date(); today.setHours(0,0,0,0)
  return Math.round((release.getTime() - today.getTime()) / 86400000)
}

// ── FilterSection ──────────────────────────────────────────────────────────────

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

// ── Component principal ────────────────────────────────────────────────────────

export function ReleasesClient({ releases, tracks }: Props) {
  const [viewMode,       setViewMode]       = useState<'calendar' | 'list'>('calendar')
  const [currentMonth,   setCurrentMonth]   = useState(() => new Date())
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRow | null>(null)
  const [popoverPos,     setPopoverPos]     = useState<{ x: number; y: number } | null>(null)
  const [editingRelease,   setEditingRelease]   = useState<ReleaseRow | null>(null)
  const [showMonthPicker,  setShowMonthPicker]  = useState(false)
  const [pickerYear,       setPickerYear]       = useState(() => new Date().getFullYear())
  const [editChecklist,  setEditChecklist]  = useState<ChecklistItem[]>([])
  const [modalOpen,      setModalOpen]      = useState(false)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [sortOrder,      setSortOrder]      = useState<'asc' | 'desc'>('asc')

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Sync checklist state when opening edit modal
  useEffect(() => {
    if (editingRelease) setEditChecklist(parseChecklist(editingRelease.checklist))
  }, [editingRelease?.id])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showMonthPicker) { setShowMonthPicker(false); return }
      if (editingRelease) { setEditingRelease(null); return }
      if (selectedRelease) { setSelectedRelease(null); setPopoverPos(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showMonthPicker, editingRelease, selectedRelease])

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month])
  const numRows      = calendarDays.length / 7
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const hasActiveFilters = Boolean(search || statusFilter !== 'all')
  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  const filteredList = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = releases.filter((r) => {
      const name = releaseName(r).toLowerCase()
      if (q && !name.includes(q)) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
    filtered.sort((a, b) =>
      sortOrder === 'asc'
        ? a.releaseDate.localeCompare(b.releaseDate)
        : b.releaseDate.localeCompare(a.releaseDate)
    )
    return filtered
  }, [releases, search, statusFilter, sortOrder])

  const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const openPopover = (r: ReleaseRow, e: React.MouseEvent) => {
    setSelectedRelease(r)
    setPopoverPos({ x: e.clientX, y: e.clientY })
  }

  const closePopover = () => { setSelectedRelease(null); setPopoverPos(null) }

  // Popover position logic
  const popStyle = useMemo<React.CSSProperties>(() => {
    if (!popoverPos) return {}
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800
    const onRight  = popoverPos.x > winW / 2
    const onBottom = popoverPos.y > winH / 2
    return {
      position: 'fixed',
      zIndex: 101,
      width: 320,
      ...(onRight  ? { right: winW - popoverPos.x + 8 } : { left: popoverPos.x + 8 }),
      ...(onBottom ? { bottom: winH - popoverPos.y + 8 } : { top: popoverPos.y + 8 }),
      background: 'var(--bg-secondary)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    }
  }, [popoverPos])

  // ── Render ─────────────────────────────────────────────────────────────────

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
        .filter-search-input:focus { border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10); }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.5); }
        .release-chip { cursor: pointer; transition: opacity 0.15s ease, transform 0.15s ease; display: flex; align-items: center; gap: 5px; }
        .release-chip:hover { opacity: 0.85; transform: translateY(-1px); }
        .release-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .cal-cell { border: 0.5px solid rgba(255,255,255,0.03); padding: 8px 6px 6px; box-sizing: border-box; vertical-align: top; }
        .cal-nav-btn { transition: transform 0.15s ease, background 0.15s ease !important; }
        .cal-nav-btn:hover { transform: scale(1.12) !important; background: rgba(255,255,255,0.09) !important; }
        .compact-card { cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
        .compact-card:hover { border-color: rgba(155,148,240,0.30) !important; box-shadow: 0 6px 28px rgba(0,0,0,0.32); background: rgba(30,28,38,0.80) !important; }
      `}</style>

      {/* ── Top bar: toggle + buton nou ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
          {(['calendar', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: viewMode === mode ? 'var(--bg-secondary)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {mode === 'calendar' ? '▦ Calendar' : '☰ Listă'}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} style={{ fontSize: 13 }}>
          + Lansare nouă
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CALENDAR VIEW                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 260px)', minHeight: 420, position: 'relative' }}>
          {/* Header lună */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <button type="button" onClick={goToPrevMonth} className="cal-nav-btn" style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}>
              <ChevronLeft size={16} />
            </button>

            {/* Buton luna/an + picker */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setPickerYear(year); setShowMonthPicker((o) => !o) }}
                style={{
                  background: showMonthPicker ? 'rgba(155,148,240,0.15)' : 'none',
                  border: showMonthPicker ? '1px solid rgba(155,148,240,0.40)' : '1px solid transparent',
                  borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 16, fontWeight: 600, color: 'var(--text-primary)',
                  padding: '4px 12px', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {MONTH_NAMES[month]} {year}
                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s ease', transform: showMonthPicker ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {showMonthPicker && (
                <>
                  {/* Overlay transparent care închide picker-ul */}
                  <div onClick={() => setShowMonthPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 110 }} />

                  {/* Picker panel */}
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 111, width: 260,
                    background: 'rgba(28,27,34,0.95)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 14, padding: '14px 12px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.50)',
                  }}>
                    {/* Navigare an */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPickerYear((y) => y - 1) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 6 }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{pickerYear}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPickerYear((y) => y + 1) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 6 }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Grilă luni 4×3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {MONTH_SHORT.map((m, i) => {
                        const isSelected = pickerYear === year && i === month
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(pickerYear, i, 1)); setShowMonthPicker(false) }}
                            style={{
                              padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: isSelected ? 700 : 400,
                              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                              border: isSelected ? '1px solid rgba(155,148,240,0.55)' : '1px solid transparent',
                              background: isSelected ? 'rgba(155,148,240,0.22)' : 'rgba(255,255,255,0.04)',
                              color: isSelected ? '#ffffff' : 'rgba(200,198,188,0.80)',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            {m}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button type="button" onClick={goToNextMonth} className="cal-nav-btn" style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid calendar */}
          <div style={{
            flex: 1, minHeight: 0,
            overflow: 'hidden', borderRadius: 16,
            background: 'rgba(22,22,26,0.45)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header zile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
              {DAY_NAMES.map((d, i) => (
                <div key={i} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Celule zile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${numRows}, 1fr)`, flex: 1 }}>
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isToday = date.getTime() === today.getTime()
                const dayReleases = releases.filter((r) => matchesDay(r.releaseDate, date))

                return (
                  <div
                    key={idx}
                    className="cal-cell"
                    style={{
                      background: isToday
                        ? 'rgba(130,87,229,0.08)'
                        : isCurrentMonth
                        ? 'rgba(255,255,255,0.012)'
                        : 'transparent',
                      boxShadow: isToday
                        ? 'inset 0 0 0 1px rgba(130,87,229,0.55), inset 0 0 16px rgba(130,87,229,0.06)'
                        : 'none',
                      opacity: isCurrentMonth ? 1 : 0.30,
                    }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#9b7ff0' : 'rgba(255,255,255,0.38)',
                      marginBottom: 5, lineHeight: 1,
                    }}>
                      {date.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayReleases.map((r) => {
                        const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.PLANNING
                        const label = releaseName(r)
                        return (
                          <div
                            key={r.id}
                            className="release-chip"
                            onClick={(e) => openPopover(r, e)}
                            style={{
                              background: sc.chipBg, color: sc.chipColor,
                              padding: '4px 7px', borderRadius: 6,
                              fontSize: 11, fontWeight: 500,
                              maxWidth: '100%', overflow: 'hidden',
                              alignItems: 'center', gap: 6,
                            }}
                            title={label}
                          >
                            {/* Titlu + artist — coloană stânga */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span className="release-chip-text" style={{ fontWeight: 600 }}>
                                {r.track?.title ?? r.album?.title ?? 'Lansare'}
                              </span>
                              {r.track?.artist && (
                                <span style={{ fontSize: 10, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                                  {r.track.artist.name}
                                </span>
                              )}
                            </div>
                            {/* Simbol muzical — dreapta, pe ambele rânduri */}
                            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0, color: sc.chipColor, filter: `drop-shadow(0 0 3px ${sc.chipColor}99)` }}>
                              {STATUS_MUSIC_ICON[r.status]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legendă — poziționată absolut la stânga calendarului */}
          <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {(['RELEASED','READY','PLANNING'] as const).map((s) => {
              const sc = STATUS_COLORS[s]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: sc.chipColor, whiteSpace: 'nowrap' }}>
                  <span style={{
                    fontSize: 18, lineHeight: 1, flexShrink: 0,
                    color: sc.chipColor,
                    filter: `drop-shadow(0 0 5px ${sc.chipColor}aa)`,
                  }}>
                    {STATUS_MUSIC_ICON[s]}
                  </span>
                  {STATUS_LABELS[s]}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LIST VIEW                                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div style={{ position: 'relative' }}>
          {/* Sidebar filtre */}
          <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
            <div style={{ position: 'sticky', top: 80 }}>
              <FilterSection label="Caută" icon={<Search size={11} />}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                  <input className="filter-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artist sau piesă..." />
                </div>
              </FilterSection>

              <FilterSection label="Ordine" icon={<Circle size={11} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {([
                    { value: 'asc',  label: '↑ Trecut' },
                    { value: 'desc', label: '↓ Viitor' },
                  ] as { value: 'asc' | 'desc'; label: string }[]).map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setSortOrder(value)} style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s ease', fontFamily: 'inherit', textAlign: 'left',
                      background: sortOrder === value ? 'rgba(155,148,240,0.22)' : 'rgba(255,255,255,0.04)',
                      border: sortOrder === value ? '1px solid rgba(155,148,240,0.55)' : '1px solid rgba(255,255,255,0.09)',
                      color: sortOrder === value ? '#ffffff' : 'rgba(200,198,188,0.65)',
                      fontWeight: sortOrder === value ? 600 : 400,
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection label="Status" icon={<Circle size={11} />}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {([
                    { value: 'all',      label: 'Toate' },
                    { value: 'PLANNING', label: 'Planificare' },
                    { value: 'READY',    label: 'Gata' },
                    { value: 'RELEASED', label: 'Lansat' },
                  ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setStatusFilter(value)} style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s ease', fontFamily: 'inherit',
                      background: statusFilter === value ? 'rgba(155,148,240,0.22)' : 'rgba(255,255,255,0.04)',
                      border: statusFilter === value ? '1px solid rgba(155,148,240,0.55)' : '1px solid rgba(255,255,255,0.09)',
                      color: statusFilter === value ? '#ffffff' : 'rgba(200,198,188,0.65)',
                      fontWeight: statusFilter === value ? 600 : 400,
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {hasActiveFilters && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 20, paddingTop: 14 }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', width: '100%' }} onClick={resetFilters}>
                    Resetează filtrele
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Carduri compacte */}
          {filteredList.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="🚀"
                title="Nicio lansare găsită"
                description={hasActiveFilters ? 'Nicio lansare nu corespunde filtrelor.' : 'Nu există lansări planificate.'}
                action={
                  !hasActiveFilters
                    ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Lansare nouă</button>
                    : <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                }
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredList.map((r) => {
                const checklist  = parseChecklist(r.checklist)
                const doneCount  = checklist.filter((c) => c.done).length
                const progress   = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0
                const sc         = STATUS_COLORS[r.status] ?? STATUS_COLORS.PLANNING
                const name       = releaseName(r)

                return (
                  <div
                    key={r.id}
                    className="compact-card"
                    onClick={() => setEditingRelease(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                      background: 'rgba(22,22,26,0.65)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderRadius: 12,
                    }}
                  >
                    {r.track?.artist && (
                      <Avatar name={r.track.artist.name} imageUrl={r.track.artist.photo} size={42} />
                    )}

                    {/* Titlu + artist */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 14, fontWeight: 700, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {r.track?.title ?? r.album?.title ?? 'Lansare'}
                      </strong>
                      {r.track?.artist && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.track.artist.name}
                        </span>
                      )}
                    </div>

                    {/* Data (sus) + badge + bara (jos), toate aliniate dreapta */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.releaseDate)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                          background: sc.chipBg, color: sc.chipColor,
                          border: `1px solid ${sc.chipColor}33`,
                          whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        {checklist.length > 0 && (
                          <>
                            <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${progress}%`, background: sc.bar, borderRadius: 3, transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: 11, color: sc.chipColor, fontWeight: 500, minWidth: 26, textAlign: 'right' }}>
                              {doneCount}/{checklist.length}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* POPOVER                                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedRelease && popoverPos && (
        <>
          {/* Overlay transparent */}
          <div
            onClick={closePopover}
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          />

          {/* Popover */}
          <div style={popStyle}>
            {/* Buton X */}
            <button
              type="button"
              onClick={closePopover}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex' }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, paddingRight: 24 }}>
              {selectedRelease.track?.artist && (
                <Avatar name={selectedRelease.track.artist.name} imageUrl={selectedRelease.track.artist.photo} size={36} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {selectedRelease.track?.artist.name ?? ''}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedRelease.track?.title ?? selectedRelease.album?.title ?? 'Lansare'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {fmtDate(selectedRelease.releaseDate)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: STATUS_COLORS[selectedRelease.status]?.chipBg,
                color: STATUS_COLORS[selectedRelease.status]?.chipColor,
              }}>
                {STATUS_LABELS[selectedRelease.status] ?? selectedRelease.status}
              </span>
            </div>

            {/* Countdown */}
            {(() => {
              const diff = getDaysDiff(selectedRelease.releaseDate)
              const sc   = STATUS_COLORS[selectedRelease.status] ?? STATUS_COLORS.PLANNING
              if (selectedRelease.status === 'RELEASED') {
                return (
                  <p style={{ fontSize: 12, color: sc.chipColor, marginBottom: 12 }}>
                    Lansată acum {Math.abs(diff)} {Math.abs(diff) === 1 ? 'zi' : 'zile'}
                  </p>
                )
              }
              if (diff === 0) return <p style={{ fontSize: 12, color: sc.chipColor, marginBottom: 12 }}>Lansare azi!</p>
              if (diff > 0)  return <p style={{ fontSize: 12, color: sc.chipColor, marginBottom: 12 }}>Lansare în {diff} {diff === 1 ? 'zi' : 'zile'}</p>
              return <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>Depășită cu {Math.abs(diff)} zile</p>
            })()}

            {/* Checklist progres */}
            {(() => {
              const checklist = parseChecklist(selectedRelease.checklist)
              if (checklist.length === 0) return null
              const done = checklist.filter((c) => c.done).length
              const sc   = STATUS_COLORS[selectedRelease.status] ?? STATUS_COLORS.PLANNING
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Checklist</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{done}/{checklist.length}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(done/checklist.length*100)}%`, background: sc.bar, borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {checklist.slice(0, 5).map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: item.done ? '#6ee7b7' : 'var(--text-tertiary)', flexShrink: 0 }}>
                          {item.done ? '✓' : '○'}
                        </span>
                        <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                    {checklist.length > 5 && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+ {checklist.length - 5} altele</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Butoane */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setEditingRelease(selectedRelease); closePopover() }}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: 'rgba(155,148,240,0.15)', color: '#9B94F0',
                  border: '1px solid rgba(155,148,240,0.3)', fontFamily: 'inherit',
                }}
              >
                Editează
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL EDITARE                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {editingRelease && (
        <>
          {/* Overlay întunecat */}
          <div
            onClick={() => setEditingRelease(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }}
          />

          {/* Modal */}
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 480, maxHeight: '80vh', overflowY: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16, padding: 24,
              zIndex: 201,
            }}
          >
            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Editează lansarea</h3>
              <button
                type="button"
                onClick={() => setEditingRelease(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form action={updateReleaseAction}>
              <input type="hidden" name="id" value={editingRelease.id} />
              <input type="hidden" name="checklist" value={JSON.stringify(editChecklist)} />

              {/* Titlu readonly */}
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Lansare</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{releaseName(editingRelease)}</p>
              </div>

              {/* Data lansării + Status */}
              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Data lansării *</label>
                  <input
                    name="releaseDate"
                    className="form-input"
                    type="date"
                    defaultValue={editingRelease.releaseDate}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select name="status" className="form-select" defaultValue={editingRelease.status} required>
                    <option value="PLANNING">În planificare</option>
                    <option value="READY">Gata de lansare</option>
                    <option value="RELEASED">Lansat</option>
                  </select>
                </div>
              </div>

              {/* Checklist */}
              {editChecklist.length > 0 && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Checklist</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {editChecklist.map((item, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={(e) => {
                            const next = editChecklist.map((it, j) => j === i ? { ...it, done: e.target.checked } : it)
                            setEditChecklist(next)
                          }}
                          style={{ accentColor: 'var(--primary)', width: 15, height: 15, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Butoane */}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }}>
                Salvează modificările
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setEditingRelease(null)}>
                Anulează
              </button>
            </form>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL CREARE LANSARE                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 440, background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 24, zIndex: 201,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Lansare nouă</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: -12, marginBottom: 16 }}>
              Selectează piesa și data de lansare. Checklist-ul implicit va fi generat automat.
            </p>
            <form action={createReleaseAction}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Piesă *</label>
                <select name="trackId" className="form-select" required>
                  <option value="">Selectează piesă...</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Data lansării *</label>
                <input name="releaseDate" className="form-input" type="date" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }}>
                Adaugă lansare
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setModalOpen(false)}>
                Anulează
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}
