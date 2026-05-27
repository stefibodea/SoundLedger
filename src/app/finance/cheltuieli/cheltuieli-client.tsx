'use client'

import { useState, useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { addExpenseAction, deleteExpenseAction, importExpensesCsvAction } from '@/app/actions/expenses'

export type ExpenseRow = {
  id:          string
  category:    string
  amount:      number
  description: string | null
  period:      string
  isRecoupable: boolean
  createdAt:   string
  artist:      { id: string; name: string } | null
}

export type ArtistOption = { id: string; name: string }

type CategoryFilter = 'toate' | 'STUDIO' | 'VIDEO' | 'PROMO' | 'DISTRIBUTIE' | 'ALTELE'

const CATEGORY_LABELS: Record<string, string> = {
  STUDIO:      'Studio',
  VIDEO:       'Videoclip',
  PROMO:       'Promovare',
  DISTRIBUTIE: 'Distribuție',
  ALTELE:      'Altele',
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  STUDIO:      { bg: 'rgba(155,148,240,0.12)', color: '#9B94F0', border: 'rgba(155,148,240,0.3)' },
  VIDEO:       { bg: 'rgba(147,197,253,0.12)', color: '#93c5fd', border: 'rgba(147,197,253,0.3)' },
  PROMO:       { bg: 'rgba(110,231,183,0.12)', color: '#6ee7b7', border: 'rgba(110,231,183,0.3)' },
  DISTRIBUTIE: { bg: 'rgba(253,230,138,0.12)', color: '#fde68a', border: 'rgba(253,230,138,0.3)' },
  ALTELE:      { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)' },
}

const CATEGORY_CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: 'toate',       label: 'Toate' },
  { value: 'STUDIO',      label: 'Studio' },
  { value: 'VIDEO',       label: 'Videoclip' },
  { value: 'PROMO',       label: 'Promovare' },
  { value: 'DISTRIBUTIE', label: 'Distribuție' },
  { value: 'ALTELE',      label: 'Altele' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function CategoryBadge({ category }: { category: string }) {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.ALTELE
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {CATEGORY_LABELS[category] ?? category}
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

function AddExpenseModal({ artists, onClose }: { artists: ArtistOption[]; onClose: () => void }) {
  const currentPeriod = new Date().toISOString().slice(0, 7)
  const [isRecoupable, setIsRecoupable] = useState(false)
  const [tab, setTab] = useState<'manual' | 'csv'>('manual')
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', fontSize: 12, fontWeight: active ? 700 : 400,
    cursor: 'pointer', fontFamily: 'inherit', border: 'none', borderRadius: 8,
    background: active ? 'rgba(155,148,240,0.18)' : 'transparent',
    color: active ? '#9B94F0' : 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  })

  return (
    <Modal isOpen onClose={onClose} title="Adaugă cheltuială" size="sm">
      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        <button type="button" style={TAB_STYLE(tab === 'manual')} onClick={() => setTab('manual')}>Manual</button>
        <button type="button" style={TAB_STYLE(tab === 'csv')}   onClick={() => setTab('csv')}>Import CSV</button>
      </div>

      {tab === 'csv' ? (
        <form action={importExpensesCsvAction} onSubmit={() => setLoading(true)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input ref={fileInputRef} type="file" name="file" accept=".csv,text/csv"
            style={{ display: 'none' }} onChange={(e) => setCsvFileName(e.target.files?.[0]?.name ?? null)} />
          <div style={{
            background: csvFileName ? 'rgba(110,231,183,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${csvFileName ? 'rgba(110,231,183,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer',
          }} onClick={() => fileInputRef.current?.click()}>
            {csvFileName
              ? <p style={{ margin: 0, fontSize: 13, color: '#6ee7b7' }}>✓ {csvFileName}</p>
              : <>
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-primary)' }}>Selectează fișier CSV</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>Format: perioada, categorie, suma, descriere, artist, recuperabila</p>
                </>
            }
          </div>
          <button type="submit" className="btn btn-primary" disabled={!csvFileName || loading}>
            {loading ? 'Se importă...' : 'Importează cheltuieli'}
          </button>
        </form>
      ) : (
      <form action={addExpenseAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Categorie *</label>
          <select name="category" className="form-input form-select" required>
            <option value="">— Selectează —</option>
            <option value="STUDIO">Studio</option>
            <option value="VIDEO">Videoclip</option>
            <option value="PROMO">Promovare</option>
            <option value="DISTRIBUTIE">Distribuție</option>
            <option value="ALTELE">Altele</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Sumă (€) *</label>
          <input name="amount" type="number" step="0.01" min="0.01" className="form-input" required placeholder="ex: 1500" />
        </div>
        <div className="form-group">
          <label className="form-label">Perioadă *</label>
          <input name="period" type="month" className="form-input" required defaultValue={currentPeriod} />
        </div>
        <div className="form-group">
          <label className="form-label">Descriere</label>
          <input name="description" className="form-input" placeholder="ex: Sesiune înregistrare album" />
        </div>
        <div className="form-group">
          <label className="form-label">Artist asociat</label>
          <select name="artistId" className="form-input form-select">
            <option value="">— Niciun artist —</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="hidden" name="isRecoupable" value={isRecoupable ? 'true' : 'false'}
          />
          <div
            onClick={() => setIsRecoupable(!isRecoupable)}
            style={{
              width: 36, height: 20, borderRadius: 10, cursor: 'pointer', flexShrink: 0,
              background: isRecoupable ? 'rgba(155,148,240,0.6)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isRecoupable ? 'rgba(155,148,240,0.8)' : 'rgba(255,255,255,0.15)'}`,
              position: 'relative', transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: isRecoupable ? 18 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: isRecoupable ? '#9B94F0' : 'rgba(255,255,255,0.4)',
              transition: 'left 0.2s ease',
            }} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cheltuială recuperabilă</span>
        </div>
        <button type="submit" className="btn btn-primary">Adaugă cheltuială</button>
      </form>
      )}
    </Modal>
  )
}

export function CheltuieliClient({
  expenses,
  artists,
  canManage,
  success,
  error,
}: {
  expenses: ExpenseRow[]
  artists:  ArtistOption[]
  canManage: boolean
  success?: string
  error?:   string
}) {
  const [modalOpen,    setModalOpen]    = useState(false)
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState<CategoryFilter>('toate')
  const [recoupFilter, setRecoupFilter] = useState<'toate' | 'da' | 'nu'>('toate')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return expenses.filter((e) => {
      if (q && !e.description?.toLowerCase().includes(q) && !e.artist?.name.toLowerCase().includes(q)) return false
      if (catFilter !== 'toate' && e.category !== catFilter) return false
      if (recoupFilter === 'da' && !e.isRecoupable) return false
      if (recoupFilter === 'nu' && e.isRecoupable) return false
      return true
    })
  }, [expenses, search, catFilter, recoupFilter])

  const hasFilters = Boolean(search || catFilter !== 'toate' || recoupFilter !== 'toate')
  const reset = () => { setSearch(''); setCatFilter('toate'); setRecoupFilter('toate') }

  const totalFiltrat = filtered.reduce((s, e) => s + e.amount, 0)

  function exportCsv() {
    const header = 'perioada,categorie,suma,descriere,artist,recuperabila'
    const rows = filtered.map((e) =>
      [
        e.period,
        CATEGORY_LABELS[e.category] ?? e.category,
        e.amount.toFixed(2),
        `"${(e.description ?? '').replace(/"/g, '""')}"`,
        e.artist?.name ?? '',
        e.isRecoupable ? 'da' : 'nu',
      ].join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `cheltuieli${hasFilters ? '-filtrat' : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const th: React.CSSProperties = {
    padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)',
    borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle',
  }

  return (
    <>
      <style>{`
        .ch-search {
          display: block; width: 100%; height: 36px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
          color: #f0efe8; font-size: 13px; padding: 0 12px 0 38px;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ch-search:focus { border-color: rgba(155,148,240,0.45); box-shadow: 0 0 0 3px rgba(155,148,240,0.10); }
        .ch-search::placeholder { color: rgba(200,198,188,0.4); }
        .ch-chip {
          padding: 4px 11px; border-radius: 20px; font-size: 11px; cursor: pointer;
          font-family: inherit; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03); color: var(--text-secondary);
          transition: all 0.15s ease; white-space: nowrap;
        }
        .ch-chip.active { background: rgba(155,148,240,0.15); border-color: rgba(155,148,240,0.4); color: #9B94F0; font-weight: 700; }
        .ch-tr:hover td { background: rgba(255,255,255,0.02); }
      `}</style>

      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(error)}</p>
        </div>
      )}
      {success && (
        <div className="card" style={{ borderLeft: '3px solid #6ee7b7', marginBottom: 20 }}>
          <p style={{ color: '#6ee7b7', margin: 0 }}>
            {success === '1'
              ? 'Cheltuiala a fost adăugată cu succes.'
              : `${success} cheltuieli importate cu succes din CSV.`}
          </p>
        </div>
      )}

      <header className="page-header">
        <h1 className="page-title">Cheltuieli</h1>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}
            style={{ fontSize: 13, height: 36, padding: '0 16px', whiteSpace: 'nowrap' }}>
            + Adaugă cheltuială
          </button>
        )}
      </header>

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

              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Caută</FilterLabel>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,198,188,0.4)', pointerEvents: 'none' }} />
                  <input className="ch-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Descriere sau artist..." />
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              <div style={{ marginBottom: 16 }}>
                <FilterLabel>Categorie</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORY_CHIPS.map(({ value, label }) => (
                    <button key={value} type="button"
                      className={`ch-chip${catFilter === value ? ' active' : ''}`}
                      onClick={() => setCatFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              <div>
                <FilterLabel>Recuperabilă</FilterLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {([['toate', 'Toate'], ['da', 'Da'], ['nu', 'Nu']] as const).map(([value, label]) => (
                    <button key={value} type="button"
                      className={`ch-chip${recoupFilter === value ? ' active' : ''}`}
                      onClick={() => setRecoupFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '16px -16px 16px' }} />

              <button type="button" onClick={exportCsv}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: 12, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', boxSizing: 'border-box', padding: '0 12px' }}>
                ↓ Exportă raport{hasFilters ? ' (filtrat)' : ''}
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabel ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {expenses.length === 0 ? 'Nicio cheltuială înregistrată.' : 'Niciun rezultat pentru filtrele selectate.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Perioadă</th>
                    <th style={th}>Categorie</th>
                    <th style={th}>Descriere</th>
                    <th style={th}>Artist</th>
                    <th style={{ ...th, textAlign: 'center' }}>Recuperabilă</th>
                    <th style={{ ...th, textAlign: 'right' }}>Sumă</th>
                    {canManage && <th style={th} />}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="ch-tr">
                      <td style={td}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{e.period}</span>
                      </td>
                      <td style={td}><CategoryBadge category={e.category} /></td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          {e.description || <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: e.artist ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {e.artist?.name ?? '—'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {e.isRecoupable
                          ? <span style={{ background: 'rgba(155,148,240,0.12)', color: '#9B94F0', border: '1px solid rgba(155,148,240,0.3)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>Da</span>
                          : <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>—</span>
                        }
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(e.amount)} €
                        </span>
                      </td>
                      {canManage && (
                        <td style={td}>
                          <form action={deleteExpenseAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <button type="submit"
                              onClick={(ev) => { if (!confirm(`Ștergi cheltuiala de ${fmt(e.amount)} €?`)) ev.preventDefault() }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(252,165,165,0.5)', fontSize: 12, fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6, transition: 'color 0.15s ease' }}
                              onMouseEnter={(ev) => { ev.currentTarget.style.color = '#fca5a5' }}
                              onMouseLeave={(ev) => { ev.currentTarget.style.color = 'rgba(252,165,165,0.5)' }}>
                              Șterge
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 1 && (
                  <tfoot>
                    <tr>
                      <td colSpan={canManage ? 5 : 4} style={{ ...td, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        Total ({filtered.length} înregistrări)
                      </td>
                      <td style={{ ...td, textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(totalFiltrat)} €
                        </span>
                      </td>
                      {canManage && <td style={{ ...td, borderTop: '1px solid rgba(255,255,255,0.08)' }} />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && <AddExpenseModal artists={artists} onClose={() => setModalOpen(false)} />}
    </>
  )
}
