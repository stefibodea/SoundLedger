'use client'

import { useState, useMemo, useTransition, useRef, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, Music, Circle, User, Music2, ArrowUpDown } from 'lucide-react'
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
  declaration: 'UMAN' | 'AI' | null
  cert: {
    id: string; code: string; issuedAt: string; declaration: string
    rolesCompozitie: string | null; rolesVersuri: string | null
    rolesProductie: string | null; rolesMixaj: string | null
  } | null
}

export type ArtistOption = { id: string; name: string }

type TypeFilter   = 'all' | 'SINGLE' | 'ALBUM_TRACK' | 'EP_TRACK'
type StatusFilter = 'all' | 'RELEASED' | 'UNRELEASED'
type SortKey      = 'title' | 'artist' | 'date' | 'bpm'

type Props = {
  tracks: TrackRow[]
  artists: ArtistOption[]
  canWrite: boolean
  labelName: string
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

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// ── FilterLabel ───────────────────────────────────────────────────────────────

function FilterLabel({ children }: { children: ReactNode }) {
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

// ── Component ─────────────────────────────────────────────────────────────────

export function CatalogClient({ tracks, artists, canWrite, labelName, initialArtistFilter = '' }: Props) {
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [artistFilter, setArtistFilter] = useState(initialArtistFilter)
  const [genreFilter,  setGenreFilter]  = useState('')
  const [sortBy,       setSortBy]       = useState<SortKey>('date')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [certTrack,    setCertTrack]    = useState<TrackRow | null>(null)
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
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>
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
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
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
      key: 'declaration',
      header: 'Declarație',
      width: '110px',
      render: (t) => {
        if (!t.declaration) {
          return (
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--text-tertiary)',
            }}>
              Nedeclarat
            </span>
          )
        }
        if (t.declaration === 'UMAN') {
          return (
            <button
              type="button"
              onClick={() => setCertTrack(t)}
              style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
                color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Uman
            </button>
          )
        }
        return (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: 'rgba(253,230,138,0.10)', border: '1px solid rgba(253,230,138,0.25)',
            color: '#fde68a',
          }}>
            AI
          </span>
        )
      },
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
          Detalii
        </Link>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .filter-search-input {
          display: block; width: 100%; height: 40px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.05);
          color: var(--text-primary); font-size: 13px;
          padding: 0 36px 0 40px; outline: none; font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
        }
        .filter-search-input:focus {
          border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10);
        }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.5); }
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
        .cat-sidebar-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 7px 28px 7px 10px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .cat-sidebar-select:focus { border-color: rgba(155,148,240,0.4); color: var(--text-primary); }
        .cat-filter-chip {
          padding: 5px 8px; border-radius: 4px; border: none;
          background: transparent; color: var(--text-secondary); font-size: 13px;
          cursor: pointer; transition: background 0.12s ease, color 0.12s ease;
          text-align: left; width: 100%; font-family: inherit; font-weight: 400;
        }
        .cat-filter-chip:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .cat-filter-chip.active { color: #9B94F0; font-weight: 500; }
        .cat-sidebar-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;
        }
      `}</style>

      {/* ── Header pagină cu titlu + buton ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Catalog Muzical</h1>
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

      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre: absolute în stânga conținutului ──────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 252, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>

            {/* Panel glassmorphism */}
            <div style={{
              background: 'rgba(16,14,28,0.72)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(155,148,240,0.10)',
              borderRadius: 14,
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}>

              {/* Panel header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>
                  Filtrează
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit',
                      padding: '2px 4px', borderRadius: 4,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}
                  >
                    Resetează
                  </button>
                )}
              </div>

              {/* ── Caută ── */}
              <div style={{ marginBottom: 16 }}>
                <FilterLabel><Search size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Caută</FilterLabel>
                <div data-search-wrap style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,198,188,0.4)', pointerEvents: 'none', zIndex: 1 }} />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Titlu sau artist..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowSugg(true) }}
                    onFocus={() => { setSearchFocused(true); if (search) setShowSugg(true) }}
                    onBlur={() => { setSearchFocused(false); setTimeout(() => setShowSugg(false), 150) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { if (filteredSugg.length > 0) setSearch(filteredSugg[0]); setShowSugg(false) }
                      else if (e.key === 'Escape') setShowSugg(false)
                    }}
                    className="filter-search-input"
                    style={{ paddingRight: search ? '32px' : '12px', height: 36 }}
                  />
                  {search && (
                    <button type="button" onClick={() => { setSearch(''); setShowSugg(false) }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14, padding: 2, lineHeight: 1 }}>
                      ×
                    </button>
                  )}
                  {showSugg && filteredSugg.length > 0 && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'rgba(16,14,28,0.96)', border: '1px solid rgba(155,148,240,0.15)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                      {filteredSugg.map((s, i) => (
                        <button key={s} type="button" onMouseDown={() => { setSearch(s); setShowSugg(false) }}
                          style={{ display: 'block', width: '100%', padding: '7px 10px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', borderBottom: i < filteredSugg.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(155,148,240,0.08)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                        >{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* ── Tip piesă ── */}
              <div style={{ marginBottom: 16 }}>
                <FilterLabel><Music size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Tip piesă</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {([
                    { value: 'all', label: 'Toate' },
                    { value: 'SINGLE', label: 'Single' },
                    { value: 'ALBUM_TRACK', label: 'Album' },
                    { value: 'EP_TRACK', label: 'EP' },
                  ] as { value: TypeFilter; label: string }[]).map(({ value, label }) => {
                    const active = typeFilter === value
                    return (
                      <button key={value} type="button" onClick={() => setTypeFilter(value)} style={{
                        padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                        background: active ? 'rgba(155,148,240,0.18)' : 'rgba(255,255,255,0.04)',
                        border: active ? '1px solid rgba(155,148,240,0.40)' : '1px solid rgba(255,255,255,0.07)',
                        color: active ? '#9B94F0' : 'var(--text-primary)',
                        boxShadow: active ? '0 0 8px rgba(155,148,240,0.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* ── Status ── */}
              <div style={{ marginBottom: 16 }}>
                <FilterLabel><Circle size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Status</FilterLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([
                    { value: 'all', label: 'Toate', dot: 'rgba(200,198,188,0.3)' },
                    { value: 'RELEASED', label: 'Lansat', dot: '#4ade80' },
                    { value: 'UNRELEASED', label: 'Nelansat', dot: 'rgba(200,198,188,0.3)' },
                  ] as { value: StatusFilter; label: string; dot: string }[]).map(({ value, label, dot }) => {
                    const active = statusFilter === value
                    return (
                      <button key={value} type="button" onClick={() => setStatusFilter(value)} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                        fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                        background: active ? 'rgba(155,148,240,0.12)' : 'transparent',
                        border: active ? '1px solid rgba(155,148,240,0.25)' : '1px solid transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-primary)',
                        textAlign: 'left', width: '100%',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: value === 'RELEASED' ? '0 0 5px #4ade8088' : 'none' }} />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* ── Artist ── */}
              <div style={{ marginBottom: 16 }}>
                <FilterLabel><User size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Artist</FilterLabel>
                <select value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)} className="cat-sidebar-select">
                  <option value="">Toți artiștii</option>
                  {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* ── Gen muzical ── */}
              {genreOptions.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
                  <div style={{ marginBottom: 16 }}>
                    <FilterLabel><Music2 size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Gen muzical</FilterLabel>
                    <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="cat-sidebar-select">
                      <option value="">Toate genurile</option>
                      {genreOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* ── Sortare ── */}
              <div>
                <FilterLabel><ArrowUpDown size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Sortare</FilterLabel>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="cat-sidebar-select">
                  <option value="date">Dată adăugare</option>
                  <option value="title">Titlu</option>
                  <option value="artist">Artist</option>
                  <option value="bpm">BPM</option>
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* ── Conținut ────────────────────────────────────────────────── */}

          {/* Tabel */}
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

      </div>

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
              <label className="form-label" htmlFor="m-type">Tip *</label>
              <select id="m-type" name="type" className="form-input form-select" required>
                <option value="SINGLE">Single</option>
                <option value="ALBUM_TRACK">Track album</option>
                <option value="EP_TRACK">Track EP</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-genre">Gen muzical *</label>
              <input id="m-genre" name="genre" className="form-input" placeholder="ex: Pop, Hip-Hop" required />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-isrc">ISRC *</label>
              <input id="m-isrc" name="isrc" className="form-input" placeholder="ex: ROABC2400001" required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" htmlFor="m-audioFile">Fișier audio *</label>
            <input
              id="m-audioFile"
              name="audioFile"
              type="file"
              required
              className="form-input"
              accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
              style={{ padding: '7px 12px', cursor: 'pointer' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              MP3, WAV, FLAC • Max 50MB
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Salvează piesă</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal certificat Human Made ────────────────────────────────────── */}
      {certTrack && certTrack.cert && (() => {
        const cert = certTrack.cert!
        const issuedDate = new Date(cert.issuedAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
        return (
          <>
            <style>{`
              @keyframes cert-fadein { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
              @media print {
                body > * { display: none !important; }
                #cert-printable { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
              }
            `}</style>

            {/* Overlay blur */}
            <div
              onClick={() => setCertTrack(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(10,9,18,0.65)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            />

            {/* Container centrat scrollabil */}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 301,
              overflowY: 'auto',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              padding: '40px 20px 60px',
            }}>
              <div style={{
                width: '100%', maxWidth: 580,
                animation: 'cert-fadein 0.22s ease',
              }}>
              {/* Buton descarcă + închide */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 16,
              }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #2e7d32, #4ade80)',
                    color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    boxShadow: '0 0 16px rgba(74,222,128,0.3)',
                  }}
                >
                  Descarcă PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCertTrack(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px',
                    cursor: 'pointer', fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Documentul certificat */}
              <div id="cert-printable">
                <div style={{
                  background: '#fff', borderRadius: 4,
                  boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
                  overflow: 'hidden', fontFamily: 'Georgia, serif',
                }}>
                  <div style={{ height: 6, background: 'linear-gradient(90deg, #1a3a1a, #2e7d32, #1a3a1a)' }} />
                  <div style={{ padding: '48px 52px', color: '#111' }}>

                    {/* Antet */}
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                      <div style={{ fontSize: 12, letterSpacing: 5, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 6 }}>{labelName}</div>
                      <div style={{ fontSize: 9, letterSpacing: 3, color: '#aaa', textTransform: 'uppercase', marginBottom: 18 }}>Certificat de Autenticitate · SoundLedger</div>
                      <h1 style={{ fontSize: 30, fontWeight: 400, color: '#111', margin: '0 0 4px', letterSpacing: 2, textTransform: 'uppercase' }}>Human Made</h1>
                      <div style={{ width: 50, height: 2, background: '#2e7d32', margin: '10px auto 0' }} />
                    </div>

                    {/* Titlu piesă */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                      <p style={{ fontSize: 13, color: '#666', lineHeight: 2, margin: 0, fontStyle: 'italic' }}>Prin prezentul document se atestă că opera muzicală</p>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '8px 0 6px' }}>„{certTrack.title}"</h2>
                      <p style={{ fontSize: 15, color: '#2e7d32', margin: 0 }}>de {certTrack.artist.name}</p>
                    </div>

                    {/* Declarație */}
                    <div style={{ margin: '0 0 24px', padding: '20px 28px', background: '#f9f9f7', borderLeft: '3px solid #2e7d32', borderRadius: 2 }}>
                      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.9, margin: 0, fontStyle: 'italic' }}>{cert.declaration}</p>
                    </div>

                    {/* Echipa creativa cu semnaturi */}
                    {(cert.rolesCompozitie || cert.rolesVersuri || cert.rolesProductie || cert.rolesMixaj) && (() => {
                      const roleRows = [
                        { label: 'Compoziție', names: cert.rolesCompozitie },
                        { label: 'Versuri',    names: cert.rolesVersuri },
                        { label: 'Producție',  names: cert.rolesProductie },
                        { label: 'Mixaj',      names: cert.rolesMixaj },
                      ].filter((r) => r.names)
                      return (
                        <div style={{ margin: '0 0 28px' }}>
                          <div style={{ fontSize: 9, letterSpacing: 2, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 14 }}>Echipa creativa</div>
                          <div style={{ display: 'grid', gridTemplateColumns: roleRows.length > 2 ? '1fr 1fr' : '1fr '.repeat(roleRows.length).trim(), gap: '14px 20px' }}>
                            {roleRows.map(({ label, names }) => {
                              const nameList = (names ?? '').split(',').map((n) => n.trim()).filter(Boolean)
                              return (
                                <div key={label} style={{ paddingBottom: 12, borderBottom: '1px solid #e8e8e8' }}>
                                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                                  {nameList.map((name) => (
                                    <div key={name} style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 6 }}>{name}</div>
                                      <div style={{ height: 1, width: '80%', background: '#ccc', marginBottom: 2 }} />
                                      <div style={{ fontSize: 9, color: '#aaa' }}>Semnătură</div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Detalii */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
                      {[
                        { label: 'Cod certificat', value: cert.code, mono: true },
                        { label: 'Data emiterii',  value: issuedDate },
                        { label: 'Label muzical',  value: labelName },
                        { label: 'Status',         value: 'VALID — Certificat activ' },
                      ].map(({ label, value, mono }) => (
                        <div key={label} style={{ padding: '14px 18px', background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
                          <div style={{ fontSize: 9, letterSpacing: 2, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: label === 'Status' ? '#2e7d32' : '#111', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
                      <div>
                        <div style={{ fontSize: 9, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Emis prin platforma</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>SoundLedger</div>
                        <div style={{ fontSize: 9, color: '#bbb', marginTop: 2 }}>Protecția drepturilor artiștilor în era AI</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#bbb', marginBottom: 2 }}>Cod unic</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32', letterSpacing: 1 }}>{cert.code}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'linear-gradient(90deg, #1a3a1a, #2e7d32, #1a3a1a)' }} />
                </div>
              </div>
              </div>
            </div>
          </>
        )
      })()}
    </>
  )
}