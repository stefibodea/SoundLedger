'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { EmptyState } from '@/components/ui/EmptyState'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type ArtistRow = {
  id: string
  name: string
  realName: string | null
  genre: string
  photo: string | null
  instagram: string | null
  createdAt: string
  _count: { tracks: number }
  contracts: { id: string; status: string; royaltyPercent: number }[]
}

type SortOption = 'name' | 'date' | 'genre' | 'tracks'

type Props = {
  artists: ArtistRow[]
  genreOptions: string[]
  totalArtists: number
  withContract: number
  addedThisMonth: number
  withoutContract: number
  genreCounts: Record<string, number>
  canManage?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
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

// ── ArtistCard ────────────────────────────────────────────────────────────────

const GENRE_COLOR: Record<string, string> = {
  'Rock':       '#fca5a5',
  'Indie':      '#9B94F0',
  'Electronic': '#93c5fd',
  'Pop':        '#6ee7b7',
}

function ArtistCard({ artist }: { artist: ArtistRow }) {
  const [hovered, setHovered] = useState(false)
  const ini       = initials(artist.name)
  const barColor  = GENRE_COLOR[artist.genre] ?? 'rgba(155,148,240,0.55)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(15,15,20,0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.45), 0 0 28px rgba(155,148,240,0.18)'
          : '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Portrait */}
      <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
        {artist.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.photo}
            alt={artist.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              filter: hovered ? 'saturate(1) brightness(1)' : 'saturate(0.85) brightness(0.92)',
              transition: 'transform 0.4s ease, filter 0.3s ease',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(145deg, #111828, #0a1525)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '2rem', fontWeight: 700,
              color: 'rgba(155,148,240,0.6)',
              opacity: hovered ? 0.9 : 0.5,
              transition: 'opacity 0.25s ease',
            }}>
              {ini}
            </span>
          </div>
        )}

        {/* Hover overlay cu buton */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.50)',
          backdropFilter: hovered ? 'blur(3px)' : 'none',
          WebkitBackdropFilter: hovered ? 'blur(3px)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
          <Link
            href={`/artists/${artist.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(155,148,240,0.18)',
              border: '1px solid rgba(155,148,240,0.5)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 20px',
              textDecoration: 'none',
              backdropFilter: 'blur(4px)',
              letterSpacing: '0.02em',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(155,148,240,0.32)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(155,148,240,0.18)' }}
          >
            Vezi detalii
          </Link>
        </div>

        {/* Bottom bar — culoarea genului */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: barColor,
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 0.25s ease',
        }} />
      </div>

      {/* Info */}
      <Link href={`/artists/${artist.id}`} style={{ textDecoration: 'none', display: 'block', padding: '12px 14px 14px' }}>
        <div style={{
          fontWeight: 600, fontSize: 14, color: '#f0efe8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 7, letterSpacing: '-0.01em',
        }}>
          {artist.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-block',
            background: `${barColor}22`,
            color: barColor,
            border: `1px solid ${barColor}55`,
            fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 20,
            letterSpacing: '0.02em',
            maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {artist.genre}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(200,198,188,0.40)', flexShrink: 0 }}>
            {artist._count.tracks} piese
          </span>
        </div>
      </Link>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistsClient({
  artists,
  genreOptions,
  totalArtists,
  withContract,
  addedThisMonth,
  withoutContract,
  genreCounts,
  canManage = true,
}: Props) {
  const [search,       setSearch]       = useState('')
  const [genreFilter,  setGenreFilter]  = useState('')
  const [sortBy,       setSortBy]       = useState<SortOption>('name')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = artists.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.realName?.toLowerCase().includes(q) ?? false)) return false
      if (genreFilter && a.genre !== genreFilter) return false
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name, 'ro')
      if (sortBy === 'genre')  return a.genre.localeCompare(b.genre, 'ro')
      if (sortBy === 'tracks') return b._count.tracks - a._count.tracks
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [artists, search, genreFilter, sortBy])

  const hasActiveFilters = Boolean(search || genreFilter)
  const resetFilters = () => { setSearch(''); setGenreFilter('') }

  return (
    <>
      <style>{`
        .filter-search-input {
          display: block; width: 100%; height: 36px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
          color: #f0efe8; font-size: 13px;
          padding: 0 12px 0 38px; outline: none; font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
        }
        .filter-search-input:focus {
          border-color: rgba(155,148,240,0.45); box-shadow: 0 0 0 3px rgba(155,148,240,0.10);
        }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.4); }

        /* ── Genre chips ── */
        .genre-chip {
          padding: 4px 10px; border-radius: 6px; font-size: 11px;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.05);
          color: #d4d2c8; font-weight: 400;
        }
        .genre-chip:hover { background: rgba(255,255,255,0.09); color: #f0efe8; }
        .genre-chip.active {
          background: rgba(155,148,240,0.18); border-color: rgba(155,148,240,0.45);
          color: #9B94F0; font-weight: 600;
        }
      `}</style>

      {/* ── Conținut cu filtre poziționate absolut în stânga ─────────────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre — în stânga conținutului, neatins ─────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 220, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>Filtrează</span>
                {hasActiveFilters && (
                  <button type='button' onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}>
                    Resetează
                  </button>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Caută</FilterLabel>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,198,188,0.4)', pointerEvents: 'none', zIndex: 1 }} />
                  <input className='filter-search-input' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Nume sau nume real...' style={{ height: 36 }} />
                </div>
              </div>
              {genreOptions.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
                  <div style={{ marginBottom: 16 }}>
                    <FilterLabel>Gen muzical</FilterLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      <button type='button' onClick={() => setGenreFilter('')} className={`genre-chip${genreFilter === '' ? ' active' : ''}`}>Toate</button>
                      {genreOptions.map((g) => (
                        <button key={g} type='button' onClick={() => setGenreFilter(g)} className={`genre-chip${genreFilter === g ? ' active' : ''}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />
              <div>
                <FilterLabel>Sortare</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {([
                    { value: 'name',   label: 'Nume' },
                    { value: 'date',   label: 'Dată' },
                    { value: 'tracks', label: 'Nr. piese' },
                  ] as { value: SortOption; label: string }[]).map((opt) => (
                    <button key={opt.value} type='button'
                      onClick={() => setSortBy(opt.value)}
                      className={`genre-chip${sortBy === opt.value ? ' active' : ''}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ── Conținut original neatins ─────────────────────────────────── */}

        {/* Grid */}
        {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon=""
                title="Niciun artist găsit"
                description={hasActiveFilters ? 'Niciun artist nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun artist.'}
                action={
                  hasActiveFilters
                    ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                    : undefined
                }
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {filtered.map((a) => (
                <ArtistCard key={a.id} artist={a} />
              ))}
            </div>
          )
        }

      </div>{/* end relative container */}

      <KpiVinylSidebar kpis={[
        { value: genreCounts['Rock']       ?? 0, label: 'Rock',       accentColor: 'red'    },
        { value: genreCounts['Indie']      ?? 0, label: 'Indie',      accentColor: 'purple' },
        { value: genreCounts['Electronic'] ?? 0, label: 'Electronic', accentColor: 'blue'   },
        { value: genreCounts['Pop']        ?? 0, label: 'Pop',        accentColor: 'green'  },
      ]} />

    </>
  )
}