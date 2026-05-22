'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { LayoutGrid, Table2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { createArtistAction } from '@/app/actions/artists'

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
type ViewMode       = 'grid' | 'table'

type Props = {
  artists: ArtistRow[]
  genreOptions: string[]
  canManage: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function contractBadge(contracts: ArtistRow['contracts']) {
  const c = contracts[0]
  if (!c) return <StatusBadge label="Fără contract" variant="neutral" />
  if (c.status === 'EXPIRING') return <StatusBadge label={`Expiră — ${c.royaltyPercent}%`} variant="warning" icon="⚠" />
  return <StatusBadge label={`Activ — ${c.royaltyPercent}%`} variant="success" icon="✓" />
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const ALPHABET = ['All','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

// ── Component ─────────────────────────────────────────────────────────────────

export function ArtistsClient({ artists, genreOptions, canManage }: Props) {
  const [search,      setSearch]      = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [sortBy,      setSortBy]      = useState<SortOption>('name')
  const [letterFilter,   setLetterFilter]   = useState('all')
  const [viewMode,       setViewMode]       = useState<ViewMode>('grid')
  const [modalOpen,      setModalOpen]      = useState(false)

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

  // ── Coloane tabel ────────────────────────────────────────────────────────

  const columns: Column<ArtistRow>[] = [
    {
      key: 'artist',
      header: 'Artist',
      render: (a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={a.name} imageUrl={a.photo} size={34} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
            {a.realName && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.realName}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'genre',
      header: 'Gen',
      width: '120px',
      render: (a) => <StatusBadge label={a.genre} variant="purple" />,
    },
    {
      key: 'tracks',
      header: 'Piese',
      width: '80px',
      render: (a) => (
        <Link href={`/catalog?artist=${a.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', fontSize: 14 }}>
          {a._count.tracks}
        </Link>
      ),
    },
    {
      key: 'contract',
      header: 'Contract',
      width: '180px',
      render: (a) => contractBadge(a.contracts),
    },
    {
      key: 'date',
      header: 'Adăugat',
      width: '110px',
      render: (a) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(a.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (a) => (
        <Link href={`/artists/${a.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
          Profil →
        </Link>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        /* ── Artist card ── */
        .artist-card {
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          cursor: pointer;
          text-decoration: none;
          display: block;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          animation: fadeInUp 0.3s ease forwards;
          opacity: 0;
        }
        .artist-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(155,148,240,0.18);
          border-color: rgba(155,148,240,0.35);
        }

        /* Photo overlay on hover */
        .artist-photo-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(155,148,240,0.18) 0%, rgba(56,189,248,0.14) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 1;
        }
        .artist-card:hover .artist-photo-overlay { opacity: 1; }

        /* Image desaturation that clears on hover */
        .artist-photo-img {
          filter: saturate(0.8) brightness(0.9);
          transition: filter 0.3s ease;
        }
        .artist-card:hover .artist-photo-img {
          filter: saturate(1) brightness(1);
        }

        /* A-Z bar */
        .az-letter {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
        }
        .az-letter:hover:not(:disabled) {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
        }
        .az-letter.active {
          background: transparent;
          color: #9B94F0;
          border-color: #9B94F0;
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(155,148,240,0.45), 0 0 10px rgba(155,148,240,0.22);
          font-weight: 700;
        }
        .az-letter:disabled {
          opacity: 0.2;
          cursor: default;
        }

        /* Toggle Grid/Tabel */
        .view-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid var(--border-light);
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .view-toggle-btn.active {
          background: rgba(155,148,240,0.15);
          color: #9B94F0;
          border-color: rgba(155,148,240,0.3);
          box-shadow: 0 0 8px rgba(155,148,240,0.15);
        }

        /* Search */
        .artists-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          padding: 0 12px;
          height: 38px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          flex: 1;
          min-width: 180px;
        }
        .artists-search:focus-within {
          border-color: rgba(56,189,248,0.5);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.08);
        }
        .artists-search input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          width: 100%;
        }
        .artists-search input::placeholder { color: var(--text-tertiary, #6b6a62); }

        /* Chips */
        .artists-chip {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--border-light);
          background: transparent;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .artists-chip:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
        .artists-chip.active {
          background: rgba(155,148,240,0.15);
          color: #9B94F0;
          border-color: rgba(155,148,240,0.3);
          font-weight: 600;
        }

        /* Selects */
        .artists-select {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          padding: 6px 28px 6px 10px;
          height: 38px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }
        .artists-select:focus { border-color: rgba(155,148,240,0.4); color: var(--text-primary); }

        /* Add artist button */
        .btn-add-artist {
          background: linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%);
          border: none;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(155,148,240,0.35);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          margin-left: 4px;
          white-space: nowrap;
        }
        .btn-add-artist:hover {
          box-shadow: 0 0 30px rgba(155,148,240,0.55), 0 4px 16px rgba(56,189,248,0.2);
          transform: translateY(-1px);
        }
      `}</style>

      {/* ── Filtru alfabetic A-Z ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '16px 0', borderBottom: '1px solid var(--border-light)', marginBottom: 16 }}>
        {ALPHABET.map((letter) => {
          const key = letter === 'All' ? 'all' : letter
          const isActive = letterFilter === key
          const hasArtists = letter === 'All' || availableLetters.has(letter)
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

      {/* ── Bara de control ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Stânga: search + chips + selects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <div className="artists-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după nume sau nume real..."
            />
          </div>
          {genreOptions.length > 0 && (
            <select className="artists-select" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
              <option value="">Toate genurile</option>
              {genreOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          <select className="artists-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="name">Sortare: Nume</option>
            <option value="date">Sortare: Dată</option>
            <option value="genre">Sortare: Gen</option>
            <option value="tracks">Sortare: Piese</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {filtered.length} {filtered.length === 1 ? 'artist' : 'artiști'}
          </span>
          {hasActiveFilters && (
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={resetFilters}>
              Resetează
            </button>
          )}
        </div>

        {/* Dreapta: toggle + buton adăugare */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Vizualizare grid">
            <LayoutGrid size={16} />
          </button>
          <button type="button" className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => setViewMode('table')} title="Vizualizare tabel">
            <Table2 size={16} />
          </button>
          {canManage && (
            <button type="button" className="btn-add-artist" onClick={() => setModalOpen(true)}>
              + Adaugă artist
            </button>
          )}
        </div>
      </div>

      {/* ── Vizualizare GRID ──────────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="👥"
              title={letterFilter !== 'all' ? `Niciun artist cu numele care începe cu '${letterFilter}'` : 'Niciun artist găsit'}
              description={hasActiveFilters ? 'Niciun artist nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun artist.'}
              action={
                hasActiveFilters
                  ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                  : canManage
                  ? <button type="button" className="btn-add-artist" onClick={() => setModalOpen(true)}>+ Adaugă primul artist</button>
                  : undefined
              }
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, padding: '8px 0' }}>
            {filtered.map((a, i) => {
              const delay = Math.min(i * 0.05, 0.4)
              return (
                <Link
                  key={a.id}
                  href={`/artists/${a.id}`}
                  className="artist-card"
                  style={{ animationDelay: `${delay}s` }}
                >
                  {/* Zona foto 3:4 */}
                  <div style={{ position: 'relative', paddingBottom: '133%', background: 'var(--bg-tertiary)' }}>
                    {a.photo ? (
                      <img
                        src={a.photo}
                        alt={a.name}
                        className="artist-photo-img"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, #1e1b35 0%, #2d1b69 50%, #1a1b3a 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'rgba(155,148,240,0.6)' }}>
                          {initials(a.name)}
                        </span>
                      </div>
                    )}
                    {/* Overlay gradient la hover */}
                    <div className="artist-photo-overlay" />
                  </div>

                  {/* Info sub foto */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#f0efe8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                      {a.name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {a.genre.length > 12 ? a.genre.slice(0, 12) + '…' : a.genre}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono, Roboto Mono, Consolas, monospace', fontSize: 11 }}>
                        {a._count.tracks} piese
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* ── Vizualizare TABEL ──────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <section className="card">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(a) => a.id}
            pageSize={25}
            emptyState={
              <EmptyState
                icon="👥"
                title="Niciun artist găsit"
                description={hasActiveFilters ? 'Niciun artist nu corespunde filtrelor curente.' : 'Nu ai adăugat încă niciun artist.'}
                action={
                  canManage && !hasActiveFilters
                    ? <button type="button" className="btn-add-artist" onClick={() => setModalOpen(true)}>+ Adaugă primul artist</button>
                    : hasActiveFilters
                    ? <button type="button" className="btn btn-ghost" onClick={resetFilters}>Resetează filtrele</button>
                    : undefined
                }
              />
            }
          />
        </section>
      )}

      {/* ── Modal adăugare artist ─────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adaugă artist nou"
        description="Completează informațiile de bază. Poți edita profilul complet ulterior."
        size="md"
      >
        <form action={createArtistAction}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-name">Nume artist *</label>
              <input id="m-name" name="name" className="form-input" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-genre">Gen muzical *</label>
              <input id="m-genre" name="genre" className="form-input" required placeholder="ex: Pop, Hip-Hop" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-realName">Nume real</label>
              <input id="m-realName" name="realName" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-email">Email contact</label>
              <input id="m-email" name="contactEmail" className="form-input" type="email" />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="m-spotify">Spotify URL</label>
              <input id="m-spotify" name="spotifyUrl" className="form-input" placeholder="https://open.spotify.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="m-instagram">Instagram</label>
              <input id="m-instagram" name="instagram" className="form-input" placeholder="@username" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Anulează</button>
            <button type="submit" className="btn-add-artist">Salvează artist</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
