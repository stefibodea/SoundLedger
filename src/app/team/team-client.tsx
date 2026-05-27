'use client'

import { useState, useRef, useMemo } from 'react'
import { addComposerAction, removeComposerAction, updateComposerPhotoAction } from '@/app/actions/team'
import { Modal } from '@/components/ui/Modal'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'

export type MemberRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
}

export type ComposerRow = {
  id: string
  name: string
  email: string | null
  specialization: string | null
  photo: string | null
}

const SPEC_CATEGORIES = ['Compoziție', 'Versuri', 'Producție', 'Mixing'] as const
type SpecCategory = typeof SPEC_CATEGORIES[number]

const SPEC_LABEL: Record<SpecCategory, string> = {
  'Compoziție': 'Compozitor',
  'Versuri':    'Textier',
  'Producție':  'Producător',
  'Mixing':     'Sound Design',
}

const SPEC_LABEL_PLURAL: Record<SpecCategory, string> = {
  'Compoziție': 'Compozitori',
  'Versuri':    'Textieri',
  'Producție':  'Producători',
  'Mixing':     'Sound Design',
}

const SPEC_STYLE: Record<SpecCategory, { bg: string; color: string; border: string; barColor: string }> = {
  'Compoziție': { bg: 'rgba(155,148,240,0.15)', color: '#9B94F0', border: 'rgba(155,148,240,0.3)',  barColor: '#9B94F0' },
  'Versuri':    { bg: 'rgba(147,197,253,0.15)', color: '#93c5fd', border: 'rgba(147,197,253,0.3)',  barColor: '#93c5fd' },
  'Producție':  { bg: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: 'rgba(110,231,183,0.3)',  barColor: '#6ee7b7' },
  'Mixing':     { bg: 'rgba(253,230,138,0.15)', color: '#fde68a', border: 'rgba(253,230,138,0.3)',  barColor: '#fde68a' },
}

const FALLBACK_STYLE = { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)', barColor: 'rgba(155,148,240,0.4)' }

function AddComposerModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Adaugă membru" size="sm">
      <form action={addComposerAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Nume *</label>
          <input name="name" className="form-input" required placeholder="ex: Ion Popescu" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input name="email" type="email" className="form-input" placeholder="optional" />
        </div>
        <div className="form-group">
          <label className="form-label">Specializare</label>
          <select name="specialization" className="form-input form-select">
            <option value="">— Selectează —</option>
            <option value="Compoziție">Compozitor</option>
            <option value="Versuri">Textier</option>
            <option value="Producție">Producător</option>
            <option value="Mixing">Sound Design</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Adaugă membru</button>
      </form>
    </Modal>
  )
}

function ComposerCard({ composer, canManage }: { composer: ComposerRow; canManage: boolean }) {
  const [hovered, setHovered] = useState(false)
  const formRef  = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = composer.name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  const spec     = composer.specialization?.split(',')[0]?.trim() as SpecCategory | undefined
  const style    = spec ? (SPEC_STYLE[spec] ?? FALLBACK_STYLE) : FALLBACK_STYLE

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
          ? `0 16px 48px rgba(0,0,0,0.45), 0 0 28px ${style.bg}`
          : '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* Portrait */}
      <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
        {composer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/uploads/composers/${composer.photo}`}
            alt={composer.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.4s ease',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
            }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(145deg, #111828, #0a1525)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '2rem', fontWeight: 700,
              color: style.color,
              opacity: hovered ? 0.9 : 0.5,
              transition: 'opacity 0.25s ease',
            }}>
              {initials}
            </span>
          </div>
        )}

        {/* Manage overlay */}
        {canManage && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.60)',
            backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: hovered ? 'auto' : 'none',
          }}>
            <form ref={formRef} action={updateComposerPhotoAction}>
              <input type="hidden" name="composerId" value={composer.id} />
              <input ref={inputRef} type="file" name="photo" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={() => formRef.current?.requestSubmit()} />
              <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8, color: 'white', fontSize: 13,
                  padding: '7px 16px', cursor: 'pointer', backdropFilter: 'blur(4px)', fontFamily: 'inherit',
                }}>
                Schimbă poza
              </button>
            </form>
            <form action={removeComposerAction}>
              <input type="hidden" name="composerId" value={composer.id} />
              <button type="submit"
                style={{
                  background: 'rgba(252,165,165,0.10)', border: '1px solid rgba(252,165,165,0.25)',
                  borderRadius: 8, color: '#fca5a5', fontSize: 12,
                  padding: '6px 16px', cursor: 'pointer', backdropFilter: 'blur(4px)', fontFamily: 'inherit',
                }}
                onClick={(e) => { if (!confirm(`Elimini compozitorul "${composer.name}"?`)) e.preventDefault() }}>
                Elimină
              </button>
            </form>
          </div>
        )}

        {/* Colored bottom bar — keyed to specialization */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: style.barColor,
          opacity: hovered ? 1 : 0.55,
          transition: 'opacity 0.25s ease',
        }} />
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7,
          letterSpacing: '-0.01em',
        }}>
          {composer.name}
        </div>
        <span style={{
          display: 'inline-block',
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          letterSpacing: '0.02em',
        }}>
          {spec ? (SPEC_LABEL[spec] ?? spec) : 'Compozitor'}
        </span>
      </div>
    </div>
  )
}

export function TeamPageClient({
  composers,
  canManage,
}: {
  composers: ComposerRow[]
  canManage: boolean
}) {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [specFilter, setSpecFilter] = useState('toate')

  const specOf = (c: ComposerRow) => c.specialization?.split(',')[0]?.trim() ?? ''

  const filtered = useMemo(() => composers.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchSpec   = specFilter === 'toate' || specOf(c) === specFilter
    return matchSearch && matchSpec
  }), [composers, search, specFilter])

  const hasFilters = Boolean(search || specFilter !== 'toate')

  const KPI_COLORS: Record<SpecCategory, 'purple' | 'blue' | 'green' | 'yellow'> = {
    'Compoziție': 'purple',
    'Versuri':    'blue',
    'Producție':  'green',
    'Mixing':     'yellow',
  }

  const kpis = SPEC_CATEGORIES.map((cat) => ({
    value:       composers.filter(c => specOf(c) === cat).length,
    label:       SPEC_LABEL_PLURAL[cat],
    accentColor: KPI_COLORS[cat],
  }))

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Echipa Creativă</h1>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
            style={{ fontSize: 13, height: 36, padding: '0 16px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
          >
            + Adaugă membru
          </button>
        )}
      </header>

      <div style={{ position: 'relative' }}>
        {/* ── Filter sidebar — stânga ── */}
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
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(155,148,240,0.65)' }}>
                  Filtrează
                </span>
                {hasFilters && (
                  <button type="button" onClick={() => { setSearch(''); setSpecFilter('toate') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'rgba(155,148,240,0.55)', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#9B94F0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(155,148,240,0.55)' }}
                  >
                    Resetează
                  </button>
                )}
              </div>

              {/* Search */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 8 }}>
                  Caută
                </div>
                <input
                  className="form-input"
                  style={{ fontSize: 13 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nume..."
                />
              </div>

              <div style={{ height: 1, background: 'rgba(155,148,240,0.07)', margin: '0 -16px 16px' }} />

              {/* Specialization chips */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 10 }}>
                  Specializare
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(['toate', ...SPEC_CATEGORIES] as const).map((val) => {
                    const label  = val === 'toate' ? 'Toți' : SPEC_LABEL[val]
                    const active = specFilter === val
                    const s      = val !== 'toate' ? SPEC_STYLE[val] : null
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSpecFilter(val)}
                        style={{
                          padding: '4px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                          fontFamily: 'inherit', fontWeight: active ? 700 : 400,
                          border: active
                            ? `1px solid ${s?.border ?? 'rgba(155,148,240,0.5)'}`
                            : '1px solid rgba(255,255,255,0.08)',
                          background: active
                            ? (s?.bg ?? 'rgba(155,148,240,0.15)')
                            : 'rgba(255,255,255,0.03)',
                          color: active
                            ? (s?.color ?? '#9B94F0')
                            : 'var(--text-secondary)',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid compozitori ── */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            {composers.length === 0 ? 'Niciun compozitor adăugat încă.' : 'Niciun rezultat pentru filtrele selectate.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {filtered.map((composer) => (
              <ComposerCard key={composer.id} composer={composer} canManage={canManage} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && <AddComposerModal onClose={() => setModalOpen(false)} />}

      <KpiVinylSidebar kpis={kpis} />
    </div>
  )
}
