'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Circle, ChevronDown, X, ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { updateReleaseAction } from '@/app/actions/releases'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ReleaseRow = {
  id: string
  status: string
  releaseDate: string
  checklist: string | null
  track: { id: string; title: string; artist: { name: string; photo: string | null } } | null
  album: { id: string; title: string } | null
}

type ChecklistItem = { label: string; done: boolean }
type StatusFilter  = 'all' | 'PLANNING' | 'READY' | 'RELEASED'

type Props = {
  releases: ReleaseRow[]
}

// ── Constante ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
const MONTH_SHORT = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES   = ['Lun','Mar','Mie','Joi','Vin','Sâm','Dum']

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planificare',
  READY:    'Gata de lansare',
  RELEASED: 'Lansat',
}

const STATUS_COLORS: Record<string, { color: string; bg: string; glow: string; border: string }> = {
  RELEASED: { color: '#6ee7b7', bg: 'rgba(110,231,183,0.10)', glow: 'rgba(110,231,183,0.25)', border: 'rgba(110,231,183,0.30)' },
  READY:    { color: '#fde68a', bg: 'rgba(253,230,138,0.10)', glow: 'rgba(253,230,138,0.25)', border: 'rgba(253,230,138,0.30)' },
  PLANNING: { color: '#9B94F0', bg: 'rgba(155,148,240,0.10)', glow: 'rgba(155,148,240,0.25)', border: 'rgba(155,148,240,0.30)' },
}
const OVERDUE_COLOR = '#fca5a5'

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

function fmtDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return `${String(d).padStart(2,'0')} ${MONTH_SHORT[m-1]} ${y}`
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

// ── FilterLabel ────────────────────────────────────────────────────────────────

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

// ── Component principal ────────────────────────────────────────────────────────

export function ReleasesClient({ releases }: Props) {
  const [viewMode,        setViewMode]        = useState<'calendar' | 'list'>('calendar')
  const [currentMonth,    setCurrentMonth]    = useState(() => new Date())
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRow | null>(null)
  const [popoverPos,      setPopoverPos]      = useState<{ x: number; y: number } | null>(null)
  const [editingRelease,  setEditingRelease]  = useState<ReleaseRow | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear,      setPickerYear]      = useState(() => new Date().getFullYear())
  const [editChecklist,   setEditChecklist]   = useState<ChecklistItem[]>([])
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('all')
  const [sortOrder,       setSortOrder]       = useState<'asc' | 'desc'>('asc')

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  useEffect(() => {
    if (editingRelease) setEditChecklist(parseChecklist(editingRelease.checklist))
  }, [editingRelease?.id])

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

  // Lansări viitoare + cele trecute de termen
  const upcomingReleases = useMemo(() => {
    return releases
      .filter((r) => r.status !== 'RELEASED')
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  }, [releases])

  const isToday = (date: Date) => date.getTime() === today.getTime()

  const goToPrevMonth  = () => setCurrentMonth(new Date(year, month - 1, 1))
  const goToNextMonth  = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToToday      = () => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const openPopover  = (r: ReleaseRow, e: React.MouseEvent) => { setSelectedRelease(r); setPopoverPos({ x: e.clientX, y: e.clientY }) }
  const closePopover = () => { setSelectedRelease(null); setPopoverPos(null) }

  const popStyle = useMemo<React.CSSProperties>(() => {
    if (!popoverPos) return {}
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800
    const onRight  = popoverPos.x > winW / 2
    const onBottom = popoverPos.y > winH / 2
    return {
      position: 'fixed', zIndex: 101, width: 300,
      ...(onRight  ? { right: winW - popoverPos.x + 8 } : { left: popoverPos.x + 8 }),
      ...(onBottom ? { bottom: winH - popoverPos.y + 8 } : { top: popoverPos.y + 8 }),
      background: 'var(--bg-secondary)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 14, padding: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
      overflow: 'hidden',
    }
  }, [popoverPos])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .filter-search-input {
          display: block; width: 100%; height: 38px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05);
          color: var(--text-primary); font-size: 13px;
          padding: 0 16px 0 40px; outline: none; font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
        }
        .filter-search-input:focus { border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10); }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.45); }

        .cal-cell {
          border: 0.5px solid rgba(255,255,255,0.035);
          padding: 7px 6px 6px;
          box-sizing: border-box;
          vertical-align: top;
          transition: background 0.15s ease;
        }
        .cal-cell:hover { background: rgba(255,255,255,0.018) !important; }

        .cal-event {
          cursor: pointer;
          border-radius: 0 5px 5px 0;
          padding: 3px 7px 3px 8px;
          overflow: hidden;
          transition: filter 0.15s ease, transform 0.12s ease;
          user-select: none;
        }
        .cal-event:hover { filter: brightness(1.25); transform: translateX(1px); }

        .cal-nav-btn { transition: transform 0.15s ease, background 0.15s ease !important; }
        .cal-nav-btn:hover { transform: scale(1.12) !important; background: rgba(255,255,255,0.09) !important; }

        .upcoming-item {
          border-radius: 0 8px 8px 0;
          padding: 10px 12px 10px 14px;
          cursor: pointer;
          transition: filter 0.15s ease, background 0.15s ease;
          user-select: none;
        }
        .upcoming-item:hover { filter: brightness(1.2); }

        .list-card {
          cursor: pointer;
          border-radius: 12px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, filter 0.15s ease;
        }
        .list-card:hover { filter: brightness(1.08); box-shadow: 0 8px 32px rgba(0,0,0,0.35); }

        .month-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .today-btn:hover { background: rgba(155,148,240,0.18) !important; color: #c4bff7 !important; }
      `}</style>

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {/* Navigare lunară */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" onClick={goToPrevMonth} className="cal-nav-btn" style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <ChevronLeft size={15} />
          </button>

          {/* Picker luna/an */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => { setPickerYear(year); setShowMonthPicker((o) => !o) }}
              className="month-btn"
              style={{
                background: showMonthPicker ? 'rgba(155,148,240,0.12)' : 'transparent',
                border: showMonthPicker ? '1px solid rgba(155,148,240,0.35)' : '1px solid transparent',
                borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                padding: '5px 14px', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 6,
                letterSpacing: '-0.01em',
              }}
            >
              {MONTH_NAMES[month]} {year}
              <ChevronDown size={13} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s ease', transform: showMonthPicker ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showMonthPicker && (
              <>
                <div onClick={() => setShowMonthPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 110 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 111, width: 256,
                  background: 'rgba(28,27,34,0.97)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 14, padding: '14px 12px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear((y) => y - 1) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 6 }}>
                      <ChevronLeft size={15} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{pickerYear}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear((y) => y + 1) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 6 }}>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    {MONTH_SHORT.map((m, i) => {
                      const isSelected = pickerYear === year && i === month
                      return (
                        <button key={i} type="button"
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
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            <ChevronRight size={15} />
          </button>

          {!isCurrentMonth && (
            <button type="button" onClick={goToToday} className="today-btn" style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: 'rgba(155,148,240,0.10)', border: '1px solid rgba(155,148,240,0.25)',
              color: '#9B94F0', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s ease', marginLeft: 2,
            }}>
              Azi
            </button>
          )}
        </div>

        {/* Dreapta: toggle + buton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
            {([
              { id: 'calendar', icon: <CalendarDays size={14} />, label: 'Calendar' },
              { id: 'list',     icon: <List size={14} />,         label: 'Listă' },
            ] as const).map((mode) => (
              <button key={mode.id} type="button" onClick={() => setViewMode(mode.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: viewMode === mode.id ? 'var(--bg-secondary)' : 'transparent',
                  color: viewMode === mode.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: viewMode === mode.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CALENDAR VIEW                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

          {/* ── Grid calendar ── */}
          <div style={{
            borderRadius: 16,
            background: 'rgba(16,14,28,0.70)',
            border: '1px solid rgba(155,148,240,0.10)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(155,148,240,0.05), 0 24px 60px rgba(0,0,0,0.4)',
          }}>
            {/* Header zile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}>
              {DAY_NAMES.map((d, i) => (
                <div key={i} style={{
                  padding: '11px 6px', textAlign: 'center',
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  color: i >= 5 ? 'rgba(155,148,240,0.55)' : 'rgba(200,198,188,0.45)',
                  letterSpacing: '0.07em',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Celule */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${numRows}, minmax(90px, 1fr))` }}>
              {calendarDays.map(({ date, isCurrentMonth: isCurr }, idx) => {
                const todayCell  = isToday(date)
                const dayReleases = releases.filter((r) => matchesDay(r.releaseDate, date))
                const isWeekend  = date.getDay() === 0 || date.getDay() === 6

                return (
                  <div
                    key={idx}
                    className="cal-cell"
                    style={{
                      background: todayCell
                        ? 'rgba(155,148,240,0.07)'
                        : isWeekend && isCurr
                        ? 'rgba(255,255,255,0.008)'
                        : 'transparent',
                      boxShadow: todayCell
                        ? 'inset 0 0 0 1.5px rgba(155,148,240,0.50)'
                        : 'none',
                      opacity: isCurr ? 1 : 0.28,
                    }}
                  >
                    {/* Număr zi */}
                    <div style={{ marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: todayCell ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: todayCell ? 700 : 400,
                        color: todayCell ? '#fff' : isWeekend ? 'rgba(155,148,240,0.5)' : 'rgba(255,255,255,0.40)',
                        boxShadow: todayCell ? '0 0 10px rgba(155,148,240,0.5)' : 'none',
                        flexShrink: 0,
                      }}>
                        {date.getDate()}
                      </div>
                      {dayReleases.length > 1 && (
                        <div style={{ marginLeft: 4, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
                          {dayReleases.length}
                        </div>
                      )}
                    </div>

                    {/* Evenimente */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayReleases.map((r) => {
                        const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.PLANNING
                        return (
                          <div
                            key={r.id}
                            className="cal-event"
                            onClick={(e) => openPopover(r, e)}
                            style={{
                              borderLeft: `3px solid ${sc.color}`,
                              background: sc.bg,
                            }}
                            title={releaseName(r)}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, color: sc.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                              {r.track?.title ?? r.album?.title ?? 'Lansare'}
                            </div>
                            {r.track?.artist && (
                              <div style={{ fontSize: 9, color: sc.color, opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                                {r.track.artist.name}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Panou lateral: Lansări viitoare ── */}
          <div style={{
            borderRadius: 14,
            background: 'rgba(16,14,28,0.70)',
            border: '1px solid rgba(155,148,240,0.10)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
            position: 'sticky',
            top: 72,
            boxShadow: '0 0 0 1px rgba(155,148,240,0.05), 0 16px 48px rgba(0,0,0,0.35)',
          }}>
            {/* Header panou */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,198,188,0.55)' }}>
                Lansări
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['RELEASED','READY','PLANNING'] as const).map((s) => {
                  const sc = STATUS_COLORS[s]
                  return (
                    <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, boxShadow: `0 0 6px ${sc.glow}` }} title={STATUS_LABELS[s]} />
                  )
                })}
              </div>
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 520, overflowY: 'auto', padding: '8px 0' }}>
              {upcomingReleases.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(200,198,188,0.35)', fontSize: 13 }}>
                  Nicio lansare planificată
                </div>
              ) : (
                (() => {
                  const future  = upcomingReleases.filter((r) => getDaysDiff(r.releaseDate) >= 0)
                  const overdue = upcomingReleases.filter((r) => getDaysDiff(r.releaseDate) < 0)

                  return (
                    <>
                      {future.map((r) => {
                        const sc   = STATUS_COLORS[r.status] ?? STATUS_COLORS.PLANNING
                        const diff = getDaysDiff(r.releaseDate)
                        return (
                          <div
                            key={r.id}
                            className="upcoming-item"
                            onClick={() => setEditingRelease(r)}
                            style={{
                              margin: '2px 8px',
                              borderLeft: `3px solid ${sc.color}`,
                              background: sc.bg,
                              display: 'flex', alignItems: 'center', gap: 10,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.track?.title ?? r.album?.title ?? 'Lansare'}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                                {r.track?.artist.name ?? ''} · {fmtDateShort(r.releaseDate)}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: sc.color, flexShrink: 0, textAlign: 'right' }}>
                              {diff === 0 ? 'Azi' : `${diff}z`}
                            </div>
                          </div>
                        )
                      })}

                      {overdue.length > 0 && (
                        <>
                          <div style={{ margin: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(252,165,165,0.20)' }} />
                            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: OVERDUE_COLOR, opacity: 0.7 }}>Trecute</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(252,165,165,0.20)' }} />
                          </div>
                          {overdue.map((r) => {
                            const diff = getDaysDiff(r.releaseDate)
                            return (
                              <div
                                key={r.id}
                                className="upcoming-item"
                                onClick={() => setEditingRelease(r)}
                                style={{
                                  margin: '2px 8px',
                                  borderLeft: `3px solid ${OVERDUE_COLOR}`,
                                  background: 'rgba(252,165,165,0.07)',
                                  display: 'flex', alignItems: 'center', gap: 10,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.track?.title ?? r.album?.title ?? 'Lansare'}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
                                    {r.track?.artist.name ?? ''} · {fmtDateShort(r.releaseDate)}
                                  </div>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: OVERDUE_COLOR, flexShrink: 0 }}>
                                  {Math.abs(diff)}z
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </>
                  )
                })()
              )}
            </div>

            {/* Footer: legenda status */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {(['PLANNING','READY','RELEASED'] as const).map((s) => {
                const sc = STATUS_COLORS[s]
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: sc.color, opacity: 0.85, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(200,198,188,0.60)' }}>{STATUS_LABELS[s]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LIST VIEW                                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div style={{ position: 'relative' }}>
          {/* Sidebar filtre */}
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
                    <input className='filter-search-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Artist sau piesă...' style={{ height: 36 }} />
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
                <div style={{ marginBottom: 16 }}>
                  <FilterLabel>Ordine</FilterLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {([
                      { value: 'asc',  label: '↑ Trecut → Viitor' },
                      { value: 'desc', label: '↓ Viitor → Trecut' },
                    ] as { value: 'asc' | 'desc'; label: string }[]).map(({ value, label }) => {
                      const active = sortOrder === value
                      return (
                        <button key={value} type='button' onClick={() => setSortOrder(value)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400, background: active ? 'rgba(155,148,240,0.18)' : 'rgba(255,255,255,0.04)', border: active ? '1px solid rgba(155,148,240,0.40)' : '1px solid rgba(255,255,255,0.07)', color: active ? '#9B94F0' : 'var(--text-primary)', boxShadow: active ? '0 0 8px rgba(155,148,240,0.15)' : 'none', transition: 'all 0.15s ease' }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
                <div>
                  <FilterLabel>Status</FilterLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {([
                      { value: 'all',      label: 'Toate' },
                      { value: 'PLANNING', label: 'Planificare' },
                      { value: 'READY',    label: 'Gata' },
                      { value: 'RELEASED', label: 'Lansat' },
                    ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => {
                      const sc = value !== 'all' ? STATUS_COLORS[value] : null
                      const active = statusFilter === value
                      return (
                        <button key={value} type='button' onClick={() => setStatusFilter(value)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400, background: active ? (sc ? sc.bg : 'rgba(155,148,240,0.18)') : 'rgba(255,255,255,0.04)', border: active ? ('1px solid ' + (sc ? sc.border : 'rgba(155,148,240,0.40)')) : '1px solid rgba(255,255,255,0.07)', color: active ? (sc ? sc.color : '#9B94F0') : 'var(--text-primary)', boxShadow: active ? '0 0 8px rgba(155,148,240,0.15)' : 'none', transition: 'all 0.15s ease' }}>
                          {sc && <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />}
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Carduri */}
          {filteredList.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="🚀"
                title="Nicio lansare găsită"
                description={hasActiveFilters ? 'Nicio lansare nu corespunde filtrelor.' : 'Nu există lansări planificate.'}
                action={
                  hasActiveFilters
                    ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                    : undefined
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredList.map((r) => {
                const checklist = parseChecklist(r.checklist)
                const doneCount = checklist.filter((c) => c.done).length
                const progress  = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0
                const sc        = STATUS_COLORS[r.status] ?? STATUS_COLORS.PLANNING
                const diff      = getDaysDiff(r.releaseDate)
                const isOverdue = r.status !== 'RELEASED' && diff < 0

                return (
                  <div
                    key={r.id}
                    className="list-card"
                    onClick={() => setEditingRelease(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      background: 'rgba(16,14,28,0.65)',
                      border: `1px solid ${isOverdue ? 'rgba(252,165,165,0.18)' : 'rgba(155,148,240,0.09)'}`,
                      borderLeft: `4px solid ${isOverdue ? OVERDUE_COLOR : sc.color}`,
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    }}
                  >
                    {r.track?.artist && (
                      <Avatar name={r.track.artist.name} imageUrl={r.track.artist.photo} size={40} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 14, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {r.track?.title ?? r.album?.title ?? 'Lansare'}
                      </strong>
                      {r.track?.artist && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.track.artist.name}
                        </span>
                      )}
                    </div>

                    {/* Date + countdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.releaseDate)}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                          background: isOverdue ? 'rgba(252,165,165,0.12)' : sc.bg,
                          color: isOverdue ? OVERDUE_COLOR : sc.color,
                          border: `1px solid ${isOverdue ? 'rgba(252,165,165,0.25)' : sc.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? OVERDUE_COLOR : diff === 0 ? sc.color : 'var(--text-secondary)' }}>
                          {r.status === 'RELEASED'
                            ? `Lansat acum ${Math.abs(diff)}z`
                            : diff === 0
                            ? 'Azi!'
                            : diff > 0
                            ? `în ${diff} zile`
                            : `−${Math.abs(diff)} zile`}
                        </span>
                        {checklist.length > 0 && (
                          <>
                            <div style={{ width: 72, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${progress}%`, background: sc.color, borderRadius: 2, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${sc.glow}` }} />
                            </div>
                            <span style={{ fontSize: 10, color: sc.color, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
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
          <div onClick={closePopover} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={popStyle}>
            {/* Header colorat */}
            {(() => {
              const sc   = STATUS_COLORS[selectedRelease.status] ?? STATUS_COLORS.PLANNING
              const diff = getDaysDiff(selectedRelease.releaseDate)
              const isOverdue = selectedRelease.status !== 'RELEASED' && diff < 0
              const checklist = parseChecklist(selectedRelease.checklist)
              const done      = checklist.filter((c) => c.done).length

              return (
                <>
                  <div style={{
                    padding: '16px 16px 14px',
                    background: `linear-gradient(135deg, ${sc.bg}, transparent)`,
                    borderBottom: `1px solid ${sc.border}`,
                    position: 'relative',
                  }}>
                    <button type="button" onClick={closePopover}
                      style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', borderRadius: 4, transition: 'color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                    >
                      <X size={15} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
                      {selectedRelease.track?.artist && (
                        <Avatar name={selectedRelease.track.artist.name} imageUrl={selectedRelease.track.artist.photo} size={34} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>
                          {selectedRelease.track?.artist.name ?? ''}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {selectedRelease.track?.title ?? selectedRelease.album?.title ?? 'Lansare'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      }}>
                        {STATUS_LABELS[selectedRelease.status] ?? selectedRelease.status}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(selectedRelease.releaseDate)}</span>
                    </div>
                  </div>

                  {/* Corp popover */}
                  <div style={{ padding: '14px 16px' }}>
                    {/* Countdown */}
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: isOverdue ? 'rgba(252,165,165,0.08)' : sc.bg,
                      border: `1px solid ${isOverdue ? 'rgba(252,165,165,0.20)' : sc.border}`,
                      marginBottom: 14,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? OVERDUE_COLOR : sc.color }}>
                        {selectedRelease.status === 'RELEASED'
                          ? `Lansată acum ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'zi' : 'zile'}`
                          : diff === 0
                          ? 'Lansare azi!'
                          : diff > 0
                          ? `Lansare în ${diff} ${diff === 1 ? 'zi' : 'zile'}`
                          : `Depășită cu ${Math.abs(diff)} zile`}
                      </span>
                    </div>

                    {/* Checklist */}
                    {checklist.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,198,188,0.55)' }}>Checklist</span>
                          <span style={{ fontSize: 12, color: sc.color, fontWeight: 600 }}>{done}/{checklist.length}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', marginBottom: 8, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${checklist.length > 0 ? Math.round(done/checklist.length*100) : 0}%`, background: sc.color, borderRadius: 2, transition: 'width 0.4s ease', boxShadow: `0 0 8px ${sc.glow}` }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {checklist.slice(0, 5).map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                              <div style={{
                                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                                background: item.done ? sc.color : 'rgba(255,255,255,0.07)',
                                border: item.done ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {item.done && <span style={{ fontSize: 9, color: '#1c1b22', fontWeight: 900 }}>✓</span>}
                              </div>
                              <span style={{ color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                          {checklist.length > 5 && (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 22 }}>+ {checklist.length - 5} altele</span>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => { setEditingRelease(selectedRelease); closePopover() }}
                      style={{
                        width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        background: sc.bg, color: sc.color,
                        border: `1px solid ${sc.border}`, fontFamily: 'inherit',
                        transition: 'filter 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
                    >
                      Editează lansarea
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL EDITARE                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {editingRelease && (
        <>
          <div onClick={() => setEditingRelease(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 480, maxHeight: '80vh', overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16, padding: 24, zIndex: 201,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Editează lansarea</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{releaseName(editingRelease)}</p>
              </div>
              <button type="button" onClick={() => setEditingRelease(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 4, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            <form action={updateReleaseAction}>
              <input type="hidden" name="id" value={editingRelease.id} />
              <input type="hidden" name="checklist" value={JSON.stringify(editChecklist)} />

              <div className="form-row" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Data lansării *</label>
                  <input name="releaseDate" className="form-input" type="date" defaultValue={editingRelease.releaseDate} required />
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

              {editChecklist.length > 0 && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Checklist pregătire</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
    </>
  )
}
