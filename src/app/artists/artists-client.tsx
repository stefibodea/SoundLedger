'use client'

import { useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { Search, Music2, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
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
  canManage?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const ALPHABET = ['Toți','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

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

export function ArtistsClient({
  artists,
  genreOptions,
  totalArtists,
  withContract,
  addedThisMonth,
  withoutContract,
  canManage = true,
}: Props) {
  const [search,       setSearch]       = useState('')
  const [genreFilter,  setGenreFilter]  = useState('')
  const [sortBy,       setSortBy]       = useState<SortOption>('name')
  const [letterFilter, setLetterFilter] = useState('all')

  const availableLetters = useMemo(
    () => new Set(artists.map((a) => a.name[0]?.toUpperCase() ?? '')),
    [artists],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = artists.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !(a.realName?.toLowerCase().includes(q) ?? false)) return false
      if (genreFilter && a.genre !== genreFilter) return false
      if (letterFilter !== 'all' && a.name[0]?.toUpperCase() !== letterFilter) return false
      return true
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name, 'ro')
      if (sortBy === 'genre')  return a.genre.localeCompare(b.genre, 'ro')
      if (sortBy === 'tracks') return b._count.tracks - a._count.tracks
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return result
  }, [artists, search, genreFilter, letterFilter, sortBy])

  const hasActiveFilters = Boolean(search || genreFilter || letterFilter !== 'all')
  const resetFilters = () => { setSearch(''); setGenreFilter(''); setLetterFilter('all') }

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
        .artist-card {
          border-radius: 12px; overflow: hidden;
          background: var(--bg-secondary); border: 1px solid var(--border-light);
          cursor: pointer; text-decoration: none; display: block;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          animation: fadeInUp 0.3s ease forwards; opacity: 0;
        }
        .artist-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(155,148,240,0.18);
          border-color: rgba(155,148,240,0.35);
        }
        .artist-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(155,148,240,0.18) 0%, rgba(56,189,248,0.14) 100%);
          opacity: 0; transition: opacity 0.3s ease; pointer-events: none; z-index: 1;
        }
        .artist-card:hover .artist-photo-overlay { opacity: 1; }
        .artist-photo-img { filter: saturate(0.8) brightness(0.9); transition: filter 0.3s ease; }
        .artist-card:hover .artist-photo-img { filter: saturate(1) brightness(1); }
        .az-letter {
          width: 32px; height: 32px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 500; cursor: pointer;
          transition: all 0.15s ease; border: 1px solid transparent;
          background: transparent; color: var(--text-secondary);
        }
        .az-letter:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .az-letter.active {
          background: transparent; color: #9B94F0; border-color: #9B94F0; border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(155,148,240,0.45), 0 0 10px rgba(155,148,240,0.22); font-weight: 700;
        }
        .az-letter:disabled { opacity: 0.2; cursor: default; }
        .artists-search {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border-light);
          border-radius: 8px; padding: 0 10px; height: 36px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease; width: 100%;
        }
        .artists-search:focus-within {
          border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10);
        }
        .artists-search input {
          background: transparent; border: none; outline: none;
          color: var(--text-primary); font-size: 13px; width: 100%;
        }
        .artists-search input::placeholder { color: var(--text-tertiary, #6b6a62); }
        .filter-sort-select {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-light); border-radius: 8px;
          color: var(--text-secondary); font-size: 12px;
          padding: 7px 28px 7px 10px; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center;
          cursor: pointer; outline: none; transition: border-color 0.2s; font-family: inherit;
        }
        .filter-sort-select:focus { border-color: rgba(155,148,240,0.4); color: var(--text-primary); }
        .bare-chip {
          padding: 5px 8px; border-radius: 4px; border: none;
          background: transparent; font-size: 13px; font-family: inherit;
          cursor: pointer; text-align: left; width: 100%;
          color: var(--text-secondary); font-weight: 400;
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bare-chip:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .bare-chip.active { color: #9B94F0; font-weight: 500; }
      `}</style>

      {/* ── Conținut cu filtre poziționate absolut în stânga ─────────────── */}
      <div style={{ position: 'relative' }}>

        {/* ── Filtre — în stânga conținutului, neatins ─────────────────── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <FilterSection label="Caută" icon={<Search size={11} />}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input className="filter-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nume sau nume real..." />
              </div>
            </FilterSection>

            {genreOptions.length > 0 && (
              <FilterSection label="Gen muzical" icon={<Music2 size={11} />}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button type="button" onClick={() => setGenreFilter('')} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit', background: genreFilter === '' ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)', border: genreFilter === '' ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)', color: genreFilter === '' ? '#9B94F0' : 'rgba(200,198,188,0.60)', fontWeight: genreFilter === '' ? 500 : 400 }}>Toate</button>
                  {genreOptions.map((g) => (
                    <button key={g} type="button" onClick={() => setGenreFilter(g)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit', background: genreFilter === g ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)', border: genreFilter === g ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)', color: genreFilter === g ? '#9B94F0' : 'rgba(200,198,188,0.60)', fontWeight: genreFilter === g ? 500 : 400 }}>{g}</button>
                  ))}
                </div>
              </FilterSection>
            )}

            <FilterSection label="Sortare" icon={<ArrowUpDown size={11} />}>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '8px 28px 8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                <option value="name">Nume</option>
                <option value="date">Dată adăugare</option>
                <option value="genre">Gen muzical</option>
                <option value="tracks">Nr. piese</option>
              </select>
            </FilterSection>

            {hasActiveFilters && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', width: '100%' }} onClick={resetFilters}>
                  Resetează filtrele
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ── Conținut original neatins ─────────────────────────────────── */}

        {/* Bara A-Z */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '12px 0', borderBottom: '1px solid var(--border-light)', marginBottom: 16 }}>
          {ALPHABET.map((letter) => {
            const key = letter === 'Toți' ? 'all' : letter
            const isActive = letterFilter === key
            const hasArtists = letter === 'Toți' || availableLetters.has(letter)
            return (
              <button
                key={letter}
                type="button"
                className={`az-letter${isActive ? ' active' : ''}`}
                disabled={!hasArtists}
                onClick={() => setLetterFilter(key)}
              >
                {letter}
              </button>
            )
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon=""
                title={letterFilter !== 'all' ? `Niciun artist cu numele care începe cu '${letterFilter}'` : 'Niciun artist găsit'}
                description={hasActiveFilters ? 'Niciun artist nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun artist.'}
                action={
                  hasActiveFilters
                    ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                    : undefined
                }
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {filtered.map((a, i) => {
                const delay = Math.min(i * 0.05, 0.4)
                return (
                  <Link key={a.id} href={`/artists/${a.id}`} className="artist-card" style={{ animationDelay: `${delay}s` }}>
                    <div style={{ position: 'relative', paddingBottom: '133%', background: 'var(--bg-tertiary)' }}>
                      {a.photo ? (
                        <img src={a.photo} alt={a.name} className="artist-photo-img"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(135deg, #1e1b35 0%, #2d1b69 50%, #1a1b3a 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'rgba(155,148,240,0.6)' }}>{initials(a.name)}</span>
                        </div>
                      )}
                      <div className="artist-photo-overlay" />
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#f0efe8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {a.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {a.genre.length > 12 ? a.genre.slice(0, 12) + '…' : a.genre}
                        </span>
                        <span style={{ fontSize: 11 }}>
                          {a._count.tracks} piese
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        }

      </div>{/* end relative container */}

      <KpiVinylSidebar kpis={[
        { value: totalArtists,    label: 'Artiști',       accentColor: 'purple' },
        { value: withContract,    label: 'Cu contract',   accentColor: 'green' },
        { value: addedThisMonth,  label: 'Luna aceasta',  accentColor: 'blue' },
        { value: withoutContract, label: 'Fără contract', accentColor: withoutContract > 0 ? 'yellow' : 'gray' },
      ]} />

    </>
  )
}
