'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import Link from 'next/link'

export type ArtistFinanceRow = {
  id:               string
  name:             string
  photo:            string | null
  genre:            string
  totalAvans:       number
  totalRoyaltyPlati: number
  soldRecoupment:   number   // pozitiv = nerecuperat, negativ = recuperat complet
  totalVenituri:    number
  totalCheltuieli:  number   // avans + royalties plătite
  profitNet:        number   // venituri - cheltuieli
  status:           'NERECUPERAT' | 'RECUPERAT' | 'FARA_AVANS'
}

type StatusFilter = 'toti' | 'NERECUPERAT' | 'RECUPERAT' | 'FARA_AVANS'

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'toti',        label: 'Toți' },
  { value: 'NERECUPERAT', label: 'Nerecuperat' },
  { value: 'RECUPERAT',   label: 'Recuperat' },
  { value: 'FARA_AVANS',  label: 'Fără avans' },
]

function fmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k €`
  return `${Math.round(n)} €`
}


function ProfitBadge({ profit }: { profit: number }) {
  if (profit > 0) return (
    <span style={{ background: 'rgba(110,231,183,0.12)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      Profit
    </span>
  )
  if (profit < 0) return (
    <span style={{ background: 'rgba(252,165,165,0.12)', color: '#fca5a5', border: '1px solid rgba(252,165,165,0.3)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      Pierdere
    </span>
  )
  return (
    <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      Neutru
    </span>
  )
}

function ArtistCell({ row }: { row: ArtistFinanceRow }) {
  const initials = row.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <Link href={`/artists/${row.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: 'rgba(155,148,240,0.15)', border: '1px solid rgba(155,148,240,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {row.photo
          ? <img src={row.photo} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 11, fontWeight: 700, color: '#9B94F0' }}>{initials}</span>
        }
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.genre}</div>
      </div>
    </Link>
  )
}

function AmountCell({ value, highlight }: { value: number; highlight?: 'red' | 'green' | 'yellow' }) {
  const color = highlight === 'red' ? '#fca5a5' : highlight === 'green' ? '#6ee7b7' : highlight === 'yellow' ? '#fde68a' : 'var(--text-primary)'
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>
      {value === 0 ? <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>—</span> : fmt(value)}
    </span>
  )
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 10 }}>
      {children}
    </div>
  )
}


export function RecoupmentClient({ rows }: { rows: ArtistFinanceRow[] }) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('toti')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false
      if (statusFilter !== 'toti' && r.status !== statusFilter) return false
      return true
    })
  }, [rows, search, statusFilter])

  const hasFilters = Boolean(search || statusFilter !== 'toti')
  const reset = () => { setSearch(''); setStatusFilter('toti') }

  const th: React.CSSProperties = {
    padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)',
    borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle',
  }

  return (
    <>
      <style>{`
        .rec-search {
          display: block; width: 100%; height: 36px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
          color: #f0efe8; font-size: 13px; padding: 0 12px 0 38px;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rec-search:focus { border-color: rgba(155,148,240,0.45); box-shadow: 0 0 0 3px rgba(155,148,240,0.10); }
        .rec-search::placeholder { color: rgba(200,198,188,0.4); }
        .rec-chip {
          padding: 4px 11px; border-radius: 20px; font-size: 11px; cursor: pointer;
          font-family: inherit; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); color: var(--text-secondary);
          transition: all 0.15s ease; white-space: nowrap;
        }
        .rec-chip.active {
          background: rgba(155,148,240,0.15); border-color: rgba(155,148,240,0.4);
          color: #9B94F0; font-weight: 700;
        }
        .rec-tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>

      <div style={{ position: 'relative' }}>

        {/* ── Sidebar filtre ── */}
        <div style={{ position: 'absolute', right: 'calc(100% + 20px)', top: 0, width: 220, height: '100%' }}>
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{
              background: 'rgba(16,14,28,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(155,148,240,0.10)', borderRadius: 14, padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>
                  Filtrează
                </span>
                {hasFilters && (
                  <button type="button" onClick={reset}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}>
                    Resetează
                  </button>
                )}
              </div>

              {/* Căutare */}
              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Caută</FilterLabel>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,198,188,0.4)', pointerEvents: 'none' }} />
                  <input className="rec-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nume artist..." />
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* Status recoupment */}
              <div>
                <FilterLabel>Status recoupment</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUS_CHIPS.map(({ value, label }) => (
                    <button key={value} type="button"
                      className={`rec-chip${statusFilter === value ? ' active' : ''}`}
                      onClick={() => setStatusFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Conținut principal ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Profit & Pierdere per artist ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {rows.length === 0 ? 'Niciun artist adăugat.' : 'Niciun rezultat pentru filtrele selectate.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Artist</th>
                      <th style={{ ...th, textAlign: 'right' }}>Venituri generate</th>
                      <th style={{ ...th, textAlign: 'right' }}>Cheltuieli label</th>
                      <th style={{ ...th, textAlign: 'right' }}>Profit net label</th>
                      <th style={{ ...th, textAlign: 'center' }}>Status Profit & Pierderi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className="rec-tr">
                        <td style={td}><ArtistCell row={row} /></td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <AmountCell value={row.totalVenituri} highlight={row.totalVenituri > 0 ? 'green' : undefined} />
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <AmountCell value={row.totalCheltuieli} highlight={row.totalCheltuieli > 0 ? 'red' : undefined} />
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: row.profitNet > 0 ? '#6ee7b7' : row.profitNet < 0 ? '#fca5a5' : 'var(--text-secondary)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {row.profitNet === 0
                              ? '—'
                              : `${row.profitNet > 0 ? '+' : ''}${fmt(row.profitNet)}`
                            }
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <ProfitBadge profit={row.profitNet} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>{/* end conținut principal */}
      </div>{/* end relative container */}
    </>
  )
}
