'use client'

import { useState, useMemo, useTransition, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { Eye, Search, Shield, User, ArrowUpDown, ChevronDown } from 'lucide-react'
import { issueCertificateAction, revokeCertificateAction, bulkIssueCertificatesAction } from '@/app/actions/compliance'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type TrackRow = {
  id: string
  title: string
  genre: string | null
  status: string
  artist: { id: string; name: string }
  cert: {
    id: string
    certificateCode: string
    issuedAt: string        // ISO string serializat din Server Component
    isRevoked: boolean
  } | null
}

type Props = {
  tracks: TrackRow[]
  canManage: boolean
  defaultDeclaration: string
}

type StatusFilter = 'all' | 'uncertified' | 'certified' | 'revoked'
type SortKey      = 'title' | 'artist' | 'date'

const PER_PAGE = 25

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

// ── Component ──────────────────────────────────────────────────────────────────

export function CertificatesClient({ tracks, canManage, defaultDeclaration }: Props) {

  // filtre
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [artistFilter, setArtistFilter] = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('artist')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [page,         setPage]         = useState(1)

  // autocomplete
  const [showSugg, setShowSugg] = useState(false)

  // selecție + modal
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [modalOpen,     setModalOpen]     = useState(false)
  const [singleTrackId, setSingleTrackId] = useState<string | null>(null)
  const [declaration,   setDeclaration]   = useState(defaultDeclaration)

  const [isPending, startTransition] = useTransition()
  const singleFormRef = useRef<HTMLFormElement>(null)

  // ── Valori derivate ────────────────────────────────────────────────────────

  const artistOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of tracks) seen.set(t.artist.id, t.artist.name)
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ro'))
  }, [tracks])

  const suggestions = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return []
    const seen   = new Set<string>()
    const result: { kind: 'title' | 'artist'; label: string; sub: string }[] = []
    for (const t of tracks) {
      if (t.title.toLowerCase().includes(q)) {
        const key = `t:${t.title}`
        if (!seen.has(key)) { seen.add(key); result.push({ kind: 'title', label: t.title, sub: t.artist.name }) }
      }
    }
    for (const t of tracks) {
      if (t.artist.name.toLowerCase().includes(q)) {
        const key = `a:${t.artist.name}`
        if (!seen.has(key)) { seen.add(key); result.push({ kind: 'artist', label: t.artist.name, sub: '' }) }
      }
    }
    return result.slice(0, 8)
  }, [tracks, search])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let result = tracks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.artist.name.toLowerCase().includes(q)) return false
      if (artistFilter && t.artist.id !== artistFilter) return false
      if (statusFilter === 'certified')   return Boolean(t.cert && !t.cert.isRevoked)
      if (statusFilter === 'uncertified') return !t.cert || t.cert.isRevoked
      if (statusFilter === 'revoked')     return t.cert?.isRevoked === true
      return true
    })
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'title')  cmp = a.title.localeCompare(b.title, 'ro')
      if (sortKey === 'artist') cmp = a.artist.name.localeCompare(b.artist.name, 'ro')
      if (sortKey === 'date') {
        const da = a.cert ? new Date(a.cert.issuedAt).getTime() : 0
        const db = b.cert ? new Date(b.cert.issuedAt).getTime() : 0
        cmp = da - db
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [tracks, search, statusFilter, artistFilter, sortKey, sortDir])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pageRows    = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const selectableIds = useMemo(
    () => new Set(filtered.filter((t) => !t.cert || t.cert.isRevoked).map((t) => t.id)),
    [filtered],
  )

  const activeSelected = useMemo(
    () => new Set([...selected].filter((id) => selectableIds.has(id))),
    [selected, selectableIds],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetPage = () => setPage(1)

  const changeSearch = (val: string) => {
    setSearch(val)
    setShowSugg(true)
    resetPage()
  }

  const changeStatus = (val: StatusFilter) => {
    setStatusFilter(val)
    resetPage()
  }

  const changeArtist = (val: string) => {
    setArtistFilter(val)
    resetPage()
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAllPage = () => {
    const pageSelectables = pageRows.filter((t) => selectableIds.has(t.id)).map((t) => t.id)
    const allSelected = pageSelectables.length > 0 && pageSelectables.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) pageSelectables.forEach((id) => next.delete(id))
      else             pageSelectables.forEach((id) => next.add(id))
      return next
    })
  }

  const openSingle = (trackId: string) => { setSingleTrackId(trackId); setDeclaration(defaultDeclaration); setModalOpen(true) }
  const openBulk   = ()                 => { setSingleTrackId(null);    setDeclaration(defaultDeclaration); setModalOpen(true) }
  const closeModal  = ()                => { setModalOpen(false); setSingleTrackId(null) }

  const handleConfirm = () => {
    if (singleTrackId) {
      singleFormRef.current?.requestSubmit()
    } else {
      startTransition(() => {
        const fd = new FormData()
        fd.set('trackIds', [...activeSelected].join(','))
        fd.set('declaration', declaration)
        bulkIssueCertificatesAction(fd)
      })
    }
    closeModal()
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

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
        .filter-search-input:focus {
          border-color: rgba(155,148,240,0.5); box-shadow: 0 0 0 3px rgba(155,148,240,0.10);
        }
        .filter-search-input::placeholder { color: rgba(200,198,188,0.5); }
        .cert-table-row { transition: background 0.12s ease; }
        .cert-table-row:hover { background: rgba(255,255,255,0.03); }
        .cert-view-btn {
          display: inline-flex; align-items: center; padding: 4px 8px; borderRadius: 6px;
          border: 1px solid rgba(255,255,255,0.12); color: var(--text-secondary);
          text-decoration: none; transition: all 0.12s ease;
        }
        .cert-view-btn:hover { border-color: rgba(155,148,240,0.4); color: #9B94F0; }
        .revoke-btn:hover { color: var(--role-artist-dark); }
      `}</style>

      {/* ── Layout: filtre absolute stânga + conținut full-width ───────── */}
      <div style={{ position: 'relative' }}>

        {/* Filtre: absolute în stânga conținutului */}
        <div style={{ position: 'absolute', right: 'calc(100% + 24px)', top: 0, width: 200, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>

            <FilterSection label="Caută" icon={<Search size={11} />}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  className="filter-search-input"
                  type="text"
                  placeholder="Titlu sau artist..."
                  value={search}
                  onChange={(e) => changeSearch(e.target.value)}
                  onFocus={() => { if (search) setShowSugg(true) }}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                />
                {showSugg && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                    background: 'var(--bg-primary)', border: '1px solid var(--border-medium)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden',
                  }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={`${s.kind}-${s.label}`}
                        type="button"
                        onMouseDown={() => { setSearch(s.label); setShowSugg(false); resetPage() }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 10px',
                          background: 'none', border: 'none',
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light)' : 'none',
                          cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                      >
                        <span style={{ flexShrink: 0 }}>{s.kind === 'title' ? '♪' : '👤'}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: s.kind === 'title' ? 600 : 400 }}>{s.label}</div>
                          {s.sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.sub}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FilterSection>

            <FilterSection label="Certificare" icon={<Shield size={11} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {([
                  ['all',          'Toate'],
                  ['uncertified',  'Necert.'],
                  ['certified',    'Certif.'],
                  ['revoked',      'Revocate'],
                ] as [StatusFilter, string][]).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => changeStatus(val)} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s ease', fontFamily: 'inherit',
                    background: statusFilter === val ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)',
                    border: statusFilter === val ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    color: statusFilter === val ? '#9B94F0' : 'rgba(200,198,188,0.60)',
                    fontWeight: statusFilter === val ? 500 : 400,
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection label="Artist" icon={<User size={11} />}>
              <select value={artistFilter} onChange={(e) => changeArtist(e.target.value)} style={{
                width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', padding: '8px 28px 8px 12px',
                fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit',
                outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b6a62'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
              }}>
                <option value="">Toți artiștii</option>
                {artistOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </FilterSection>

            <FilterSection label="Sortare" icon={<ArrowUpDown size={11} />}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['title', 'artist', 'date'] as SortKey[]).map((key) => (
                  <button key={key} type="button" onClick={() => handleSort(key)} style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s ease', fontFamily: 'inherit',
                    background: sortKey === key ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)',
                    border: sortKey === key ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    color: sortKey === key ? '#9B94F0' : 'rgba(200,198,188,0.60)',
                    fontWeight: sortKey === key ? 500 : 400,
                  }}>
                    {{ title: 'Titlu', artist: 'Artist', date: 'Dată' }[key]}{sortArrow(key)}
                  </button>
                ))}
              </div>
            </FilterSection>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 20, paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: (search || statusFilter !== 'all' || artistFilter) ? 8 : 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filtered.length}</span>
                {' '}{filtered.length === 1 ? 'piesă' : 'piese'}
              </div>
              {(search || statusFilter !== 'all' || artistFilter) && (
                <button type="button" className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', width: '100%' }}
                  onClick={() => { setSearch(''); setStatusFilter('all'); setArtistFilter(''); resetPage() }}
                >
                  Resetează filtrele
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Conținut */}

          {/* Bara bulk actions */}
          {canManage && activeSelected.size > 0 && (
            <div className="card" style={{
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {activeSelected.size} {activeSelected.size === 1 ? 'piesă selectată' : 'piese selectate'}
              </span>
              <button type="button" className="btn btn-primary" onClick={openBulk} disabled={isPending} style={{ fontSize: 13 }}>
                {isPending ? '⏳ Se procesează...' : `Certifică toate (${activeSelected.size})`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Anulează selecția
              </button>
            </div>
          )}

      {/* ── Tabel ──────────────────────────────────────────────────────────── */}
      <section className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, margin: 0 }}>Nicio piesă nu corespunde filtrelor curente.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); setArtistFilter(''); resetPage() }}
              className="btn btn-ghost"
              style={{ marginTop: 12, fontSize: 13 }}
            >
              Resetează filtrele
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead style={{ background: 'rgba(35,33,43,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {canManage && (
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                          checked={
                            pageRows.filter((t) => selectableIds.has(t.id)).length > 0 &&
                            pageRows.filter((t) => selectableIds.has(t.id)).every((t) => selected.has(t.id))
                          }
                          onChange={toggleAllPage}
                          title="Selectează toate necertificate din pagina curentă"
                        />
                      </th>
                    )}
                    <th>Titlu piesă</th>
                    <th>Artist</th>
                    <th>Gen</th>
                    <th>Status</th>
                    <th>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((track) => {
                    const isCertified  = Boolean(track.cert && !track.cert.isRevoked)
                    const isRevoked    = track.cert?.isRevoked === true
                    const isSelectable = selectableIds.has(track.id)

                    return (
                      <tr key={track.id} className="cert-table-row">
                        {canManage && (
                          <td>
                            {isSelectable && (
                              <input
                                type="checkbox"
                                style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                checked={selected.has(track.id)}
                                onChange={() => toggleOne(track.id)}
                              />
                            )}
                          </td>
                        )}

                        <td>
                          <strong style={{ fontSize: 14 }}>{track.title}</strong>
                          {track.cert && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {track.cert.certificateCode}
                            </div>
                          )}
                        </td>

                        <td style={{ fontSize: 13 }}>{track.artist.name}</td>

                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {track.genre ?? '—'}
                        </td>

                        <td>
                          {isCertified ? (
                            <>
                              <span className="badge" style={{ background: 'var(--role-ar-light)', color: 'var(--role-ar-dark)', boxShadow: '0 0 8px rgba(110,231,183,0.4), 0 0 16px rgba(110,231,183,0.15)' }}>
                                Certificat
                              </span>
                              {track.cert && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                  {fmtDate(track.cert.issuedAt)}
                                </div>
                              )}
                            </>
                          ) : isRevoked ? (
                            <span className="badge" style={{ background: 'var(--role-artist-light)', color: 'var(--role-artist-dark)', boxShadow: '0 0 8px rgba(252,165,165,0.4), 0 0 16px rgba(252,165,165,0.15)' }}>
                              Revocat
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              Necertificat
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {isCertified && track.cert && (
                              <>
                                <Link
                                  href={`/compliance/certificates/${track.cert.id}`}
                                  className="cert-view-btn"
                                  title="Vezi certificatul"
                                >
                                  <Eye size={16} />
                                </Link>
                                {canManage && (
                                  <form action={revokeCertificateAction}>
                                    <input type="hidden" name="id" value={track.cert.id} />
                                    <input type="hidden" name="reason" value="Revocat manual de Label Manager" />
                                    <button
                                      type="submit"
                                      className="btn btn-sm btn-ghost revoke-btn"
                                      style={{ fontSize: 11, color: 'var(--role-artist-dark)' }}
                                      onClick={(e) => {
                                        if (!confirm(`Revoci certificatul pentru "${track.title}"?`)) e.preventDefault()
                                      }}
                                    >
                                      Revocă
                                    </button>
                                  </form>
                                )}
                              </>
                            )}
                            {!isCertified && canManage && (
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: 11, color: 'var(--role-ar-dark)' }}
                                onClick={() => openSingle(track.id)}
                              >
                                Certifică
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginare */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Pagina {currentPage} din {totalPages} · {filtered.length} piese
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
                    ← Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '...'
                        ? <span key={`e${i}`} style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-secondary)' }}>…</span>
                        : (
                          <button key={p} type="button"
                            className={p === currentPage ? 'btn btn-secondary' : 'btn btn-ghost'}
                            style={{ fontSize: 12, padding: '6px 10px', minWidth: 32 }}
                            onClick={() => setPage(p as number)}
                          >{p}</button>
                        )
                    )}
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
                    Următor →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      </div>{/* end relative */}

      {/* ── Modal certificare ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 560, border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 4 }}>
                {singleTrackId ? 'Certificat Human Made' : `Certificare în bulk (${activeSelected.size} piese)`}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {singleTrackId
                  ? 'Verifică și editează declarația, apoi confirmă emiterea certificatului.'
                  : `O declarație comună va fi aplicată tuturor celor ${activeSelected.size} piese selectate.`}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Declarație (editabilă)</label>
              <textarea
                className="form-input form-textarea"
                rows={5}
                value={declaration}
                onChange={(e) => setDeclaration(e.target.value)}
              />
              {declaration.length < 20 && (
                <p style={{ fontSize: 11, color: 'var(--role-artist-dark)', marginTop: 4 }}>
                  Declarația trebuie să aibă minim 20 de caractere.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={closeModal} style={{ fontSize: 13 }}>
                Anulează
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={declaration.length < 20}
                style={{ fontSize: 13 }}
              >
                ✓ Confirmă și emite
              </button>
            </div>

            {singleTrackId && (
              <form ref={singleFormRef} action={issueCertificateAction} style={{ display: 'none' }}>
                <input type="hidden" name="trackId" value={singleTrackId} />
                <input type="hidden" name="declaration" value={declaration} />
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
