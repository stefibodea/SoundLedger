'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { createTrackAction, toggleTrackStatusAction } from '@/app/actions/catalog'

// ── Toggle status ─────────────────────────────────────────────────────────────

function TrackStatusToggle({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const released = status === 'RELEASED'
  return (
    <button
      type="button"
      title="Click pentru a schimba statusul"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData()
          fd.append('id', id)
          fd.append('returnTo', '/catalog')
          await toggleTrackStatusAction(fd)
        })
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 999, border: 'none',
        cursor: isPending ? 'default' : 'pointer',
        background: released ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
        opacity: isPending ? 0.5 : 1,
        transition: 'opacity 0.12s ease',
        fontFamily: 'inherit',
      }}
    >
      {/* Dot indicator */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: released ? '#4ade80' : 'var(--text-tertiary)',
        boxShadow: released ? '0 0 6px #4ade8099' : 'none',
        display: 'inline-block',
      }} />
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: released ? '#4ade80' : 'var(--text-secondary)',
      }}>
        {released ? 'Lansat' : 'Nelansat'}
      </span>
    </button>
  )
}

// ── Type badge ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SINGLE:      'Single',
  ALBUM_TRACK: 'Album Track',
  EP_TRACK:    'EP Track',
}

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_LABELS[type] ?? type
  if (type === 'SINGLE') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        background: 'linear-gradient(135deg, rgba(155,148,240,0.18) 0%, rgba(56,189,248,0.12) 100%)',
        border: '1px solid rgba(155,148,240,0.35)',
        color: '#9B94F0',
        boxShadow: '0 0 8px rgba(155,148,240,0.15)',
      }}>
        {label}
      </div>
    )
  }
  if (type === 'ALBUM_TRACK') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
        background: 'rgba(96,165,250,0.10)',
        border: '1px solid rgba(96,165,250,0.25)',
        color: '#60a5fa',
      }}>
        {label}
      </div>
    )
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
      background: 'rgba(34,211,238,0.09)',
      border: '1px solid rgba(34,211,238,0.22)',
      color: '#22d3ee',
    }}>
      {label}
    </div>
  )
}

// ── Avatar cu pulse ───────────────────────────────────────────────────────────

const PALETTE = ['#9b94f0', '#4ade80', '#facc15', '#60a5fa', '#22d3ee', '#f97316', '#ec4899', '#a78bfa']

function nameToColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function ArtistAvatar({ name, photo, isRecent }: { name: string; photo: string | null; isRecent: boolean }) {
  const color = nameToColor(name)
  const shadow = isRecent
    ? `0 0 0 2px ${color}55, 0 0 8px ${color}40`
    : `0 0 0 2px ${color}30`
  const anim = isRecent ? 'cat-avatar-pulse 2.5s ease-in-out infinite' : 'none'

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        style={{
          width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
          boxShadow: shadow, animation: anim,
        }}
      />
    )
  }

  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%',
      background: color, color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
      userSelect: 'none', boxShadow: shadow, animation: anim,
    }}>
      {nameInitials(name)}
    </div>
  )
}

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type TrackRow = {
  id: string
  title: string
  type: string
  status: string
  genre: string | null
  isrc: string | null
  bpm: number | null
  duration: number | null
  coverArt: string | null
  createdAt: string
  artist: { id: string; name: string; photo: string | null }
}

export type ArtistOption = { id: string; name: string }

type TypeFilter   = 'all' | 'SINGLE' | 'ALBUM_TRACK' | 'EP_TRACK'
type StatusFilter = 'all' | 'RELEASED' | 'UNRELEASED'
type SortKey      = 'title' | 'artist' | 'date' | 'bpm'

type Props = {
  tracks: TrackRow[]
  artists: ArtistOption[]
  canWrite: boolean
  initialArtistFilter?: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const MONO = 'JetBrains Mono, Roboto Mono, Consolas, monospace'
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// ── Component ─────────────────────────────────────────────────────────────────

export function CatalogClient({ tracks, artists, canWrite, initialArtistFilter = '' }: Props) {
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [artistFilter, setArtistFilter] = useState(initialArtistFilter)
  const [genreFilter,  setGenreFilter]  = useState('')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [showSugg,     setShowSugg]     = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [addHover,     setAddHover]     = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const genreOptions = useMemo(() =>
    [...new Set(tracks.map((t) => t.genre).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ro')),
    [tracks],
  )

  const suggestions = useMemo(() => [
    ...new Set(tracks.flatMap((t) => [t.title, t.artist.name]))
  ], [tracks])

  const filteredSugg = suggestions
    .filter((s) => s.toLowerCase().includes(search.toLowerCase()) && s !== search)
    .slice(0, 6)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.closest('[data-search-wrap]')?.contains(e.target as Node)) {
        setShowSugg(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = tracks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.artist.name.toLowerCase().includes(q)) return false
      if (typeFilter   !== 'all' && t.type   !== typeFilter)   return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (artistFilter && t.artist.id !== artistFilter)         return false
      if (genreFilter  && t.genre     !== genreFilter)          return false
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'title')  return a.title.localeCompare(b.title, 'ro')
      if (sortBy === 'artist') return a.artist.name.localeCompare(b.artist.name, 'ro')
      if (sortBy === 'bpm')    return (b.bpm ?? 0) - (a.bpm ?? 0)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [tracks, search, typeFilter, statusFilter, artistFilter, genreFilter, sortBy])

  const hasActiveFilters = Boolean(search || typeFilter !== 'all' || statusFilter !== 'all' || artistFilter || genreFilter)

  const resetFilters = () => {
    setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setArtistFilter(''); setGenreFilter('')
  }

  const now = Date.now()

  // ── Coloane ───────────────────────────────────────────────────────────────

  const columns: Column<TrackRow>[] = [
    {
      key: 'track',
      header: 'Titlu piesă',
      render: (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {t.coverArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.coverArt} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 4, flexShrink: 0,
              background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🎵</div>
          )}
          <div>
            <Link href={`/catalog/${t.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
              {t.title}
            </Link>
            {t.isrc && (
              <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--text-secondary)', marginTop: 1 }}>
                {t.isrc}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'artist',
      header: 'Artist',
      width: '160px',
      render: (t) => {
        const isRecent = now - new Date(t.createdAt).getTime() < MONTH_MS
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArtistAvatar name={t.artist.name} photo={t.artist.photo} isRecent={isRecent} />
            <span style={{ fontSize: 13 }}>{t.artist.name}</span>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Tip',
      width: '120px',
      render: (t) => <TypeBadge type={t.type} />,
    },
    {
      key: 'genre',
      header: 'Gen',
      width: '100px',
      render: (t) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.genre ?? '—'}</span>,
    },
    {
      key: 'bpm',
      header: 'BPM',
      width: '60px',
      render: (t) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: MONO }}>
          {t.bpm ?? '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Durată',
      width: '70px',
      render: (t) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDuration(t.duration)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (t) => {
        if (!canWrite) {
          const released = t.status === 'RELEASED'
          return (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 999,
              background: released ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                background: released ? '#4ade80' : 'var(--text-tertiary)',
                boxShadow: released ? '0 0 6px #4ade8099' : 'none',
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: released ? '#4ade80' : 'var(--text-secondary)' }}>
                {released ? 'Lansat' : 'Nelansat'}
              </span>
            </div>
          )
        }
        return <TrackStatusToggle id={t.id} status={t.status} />
      },
    },
    {
      key: 'date',
      header: 'Adăugat',
      width: '100px',
      render: (t) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: MONO }}>
          {fmtDate(t.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      render: (t) => (
        <Link
          href={`/catalog/${t.id}`}
          className="detail-btn"
          style={{
            display: 'inline-block',
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'all 0.12s ease',
          }}
        >
          Detalii →
        </Link>
      ),
    },
  ]

  // Select style helper
  const selectStyle: React.CSSProperties = {
    width: 'auto', minWidth: 150,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '7px 32px 7px 12px',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    outline: 'none',
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes cat-avatar-pulse {
          0%, 100% { box-shadow: 0 0 0 2px var(--pulse-color, #9b94f055), 0 0 6px var(--pulse-color, #9b94f030); }
          50%       { box-shadow: 0 0 0 4px var(--pulse-color, #9b94f020), 0 0 14px var(--pulse-color, #9b94f015); }
        }
        .catalog-table .table tbody tr {
          border-left: 3px solid transparent;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .catalog-table .table tbody tr:hover {
          background: rgba(255,255,255,0.03);
          border-left: 3px solid #9B94F0;
        }
        .catalog-table .table tbody tr .detail-btn {
          opacity: 0.45;
        }
        .catalog-table .table tbody tr:hover .detail-btn {
          opacity: 1;
          border-color: rgba(155,148,240,0.4);
          color: #9B94F0;
        }
        .cat-select:focus {
          border-color: rgba(56,189,248,0.5) !important;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12) !important;
          outline: none;
        }
      `}</style>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search cu gradient focus */}
          <div data-search-wrap style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            {/* Lupa */}
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: searchFocused ? '#38bdf8' : 'var(--text-tertiary)',
              transition: 'color 0.15s ease',
              display: 'flex',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Caută după titlu sau artist..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSugg(true) }}
              onFocus={() => { setSearchFocused(true); if (search) setShowSugg(true) }}
              onBlur={() => { setSearchFocused(false); setTimeout(() => setShowSugg(false), 150) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { if (filteredSugg.length > 0) setSearch(filteredSugg[0]); setShowSugg(false) }
                else if (e.key === 'Escape') setShowSugg(false)
              }}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: search ? 32 : undefined,
                borderColor: searchFocused ? 'rgba(56,189,248,0.6)' : undefined,
                boxShadow: searchFocused ? '0 0 0 3px rgba(56,189,248,0.12)' : undefined,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setShowSugg(false) }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, padding: 2 }}>
                ✕
              </button>
            )}
            {/* Sugestii autocomplete */}
            {showSugg && filteredSugg.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                background: 'var(--bg-primary)', border: '1px solid var(--border-medium)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden',
              }}>
                {filteredSugg.map((s, i) => (
                  <button key={s} type="button" onMouseDown={() => { setSearch(s); setShowSugg(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                      color: 'var(--text-primary)',
                      borderBottom: i < filteredSugg.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    🔍 {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chips tip */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([
              { value: 'all', label: 'Toate' },
              { value: 'SINGLE', label: 'Single' },
              { value: 'ALBUM_TRACK', label: 'Album' },
              { value: 'EP_TRACK', label: 'EP' },
            ] as { value: TypeFilter; label: string }[]).map(({ value, label }) => {
              const active = typeFilter === value
              return (
                <button key={value} type="button" onClick={() => setTypeFilter(value)}
                  style={{
                    padding: '5px 13px', borderRadius: 999, fontSize: 12, fontFamily: 'inherit',
                    fontWeight: active ? 600 : 400, cursor: 'pointer',
                    border: active ? '1px solid rgba(155,148,240,0.5)' : '1px solid var(--border-light)',
                    background: active ? 'rgba(155,148,240,0.12)' : 'transparent',
                    color: active ? '#9B94F0' : 'var(--text-secondary)',
                    boxShadow: active ? '0 0 10px rgba(155,148,240,0.2), inset 0 0 6px rgba(155,148,240,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Dropdowns stilizate */}
          {[
            {
              id: 'status', placeholder: 'Orice status', value: statusFilter,
              onChange: (v: string) => setStatusFilter(v as StatusFilter),
              options: [{ value: 'RELEASED', label: 'Lansate' }, { value: 'UNRELEASED', label: 'Nelansate' }],
            },
            {
              id: 'artist', placeholder: 'Toți artiștii', value: artistFilter,
              onChange: setArtistFilter,
              options: artists.map((a) => ({ value: a.id, label: a.name })),
            },
            {
              id: 'genre', placeholder: 'Toate genurile', value: genreFilter,
              onChange: setGenreFilter,
              options: genreOptions.map((g) => ({ value: g, label: g })),
            },
            {
              id: 'sort', placeholder: '', value: sortBy,
              onChange: (v: string) => setSortBy(v as SortKey),
              options: [
                { value: 'date', label: 'Sortare: Dată' },
                { value: 'title', label: 'Sortare: Titlu' },
                { value: 'artist', label: 'Sortare: Artist' },
                { value: 'bpm', label: 'Sortare: BPM' },
              ],
            },
          ].map((dd) => (
            <select
              key={dd.id}
              className="cat-select"
              value={dd.value}
              onChange={(e) => dd.onChange(e.target.value)}
              style={selectStyle}
            >
              {dd.placeholder && <option value="">{dd.placeholder}</option>}
              {dd.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
        </div>

        {/* Counter + reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'piesă' : 'piese'}
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters}
                style={{ marginLeft: 10, fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ✕ Resetează filtrele
              </button>
            )}
          </span>
        </div>
      </div>

      {/* ── Bara de acțiuni ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Link href="/catalog/albums" className="btn btn-ghost" style={{ fontSize: 13 }}>
          🎵 Albume & EP-uri →
        </Link>
        {canWrite && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
              color: 'white', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: addHover
                ? '0 0 20px rgba(56,189,248,0.45), 0 0 40px rgba(155,148,240,0.25), 0 4px 12px rgba(0,0,0,0.3)'
                : '0 0 10px rgba(56,189,248,0.2)',
              transform: addHover ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'box-shadow 0.2s ease, transform 0.15s ease',
            }}
          >
            + Adaugă piesă
          </button>
        )}
      </div>

      {/* ── Tabel ────────────────────────────────────────────────────────────── */}
      <section className="card catalog-table">
        <DataTable
          key={`${typeFilter}|${statusFilter}|${artistFilter}|${genreFilter}|${sortBy}|${search}`}
          data={filtered}
          columns={columns}
          getRowKey={(t) => t.id}
          pageSize={25}
          emptyState={
            <EmptyState
              icon="🎵"
              title="Nicio piesă găsită"
              description={
                hasActiveFilters
                  ? 'Nicio piesă nu corespunde filtrelor curente.'
                  : 'Nu ai adăugat încă nicio piesă în catalog.'
              }
              action={
                canWrite && !hasActiveFilters
                  ? <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Adaugă prima piesă</button>
                  : hasActiveFilters
                  ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                  : undefined
              }
            />
          }
        />
      </section>

      {/* ── Modal adăugare ───────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adaugă piesă nouă"
        description="Completează detaliile de bază. Poți edita informațiile complete din pagina piesei."
        size="lg"
      >
        <form action={createTrackAction}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-title">Titlu piesă *</label>
              <input id="m-title" name="title" className="form-input" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-artistId">Artist *</label>
              <select id="m-artistId" name="artistId" className="form-input form-select" required>
                <option value="">Selectează artist</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-type">Tip</label>
              <select id="m-type" name="type" className="form-input form-select">
                <option value="SINGLE">Single</option>
                <option value="ALBUM_TRACK">Track album</option>
                <option value="EP_TRACK">Track EP</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-genre">Gen muzical</label>
              <input id="m-genre" name="genre" className="form-input" placeholder="ex: Pop, Hip-Hop" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-isrc">ISRC</label>
              <input id="m-isrc" name="isrc" className="form-input" placeholder="ex: ROABC2400001" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="m-audioFile">Fișier audio (opțional)</label>
            <input
              id="m-audioFile"
              name="audioFile"
              type="file"
              className="form-input"
              accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
              style={{ padding: '7px 12px', cursor: 'pointer' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              MP3, WAV, FLAC • Max 50MB • BPM-ul va fi calculat automat
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Salvează piesă</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
