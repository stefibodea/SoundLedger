'use client'

import { useState, useRef, useEffect } from 'react'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type FilterChip = {
  value: string
  label: string
}

export type FilterDropdown = {
  id: string
  placeholder: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export type SortOption = {
  value: string
  label: string
}

type Props = {
  /** Textul curent din câmpul de căutare */
  searchQuery: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string

  /** Chips-uri de filtru rapid (ex: "Toate / Activ / Inactiv") */
  chips?: {
    value: string
    activeValue: string
    onChange: (v: string) => void
    options: FilterChip[]
  }

  /** Dropdown-uri de filtru (ex: "Toți artiștii") */
  dropdowns?: FilterDropdown[]

  /** Opțiuni de sortare */
  sortOptions?: SortOption[]
  sortValue?: string
  onSortChange?: (v: string) => void

  /** Sugestii autocomplete derivate din date */
  suggestions?: string[]

  /** Numărul de rezultate găsite — afișat în bara */
  resultsCount: number
  resultsLabel?: string

  /** Buton de reset filtre — apare când există filtre active */
  onReset?: () => void
  hasActiveFilters?: boolean
}

/**
 * Bara de filtre standardizată — componentă client cu state intern pentru autocomplete.
 * Filtrele reale (chips, dropdown-uri) sunt controlate de componenta părinte.
 */
export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Caută...',
  chips,
  dropdowns = [],
  sortOptions,
  sortValue,
  onSortChange,
  suggestions = [],
  resultsCount,
  resultsLabel = 'rezultate',
  onReset,
  hasActiveFilters,
}: Props) {
  const [showSugg, setShowSugg] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Sugestii filtrate după textul curent
  const filteredSugg = suggestions
    .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()) && s !== searchQuery)
    .slice(0, 7)

  // Închide sugestiile la click în afară
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.closest('[data-search-wrapper]')?.contains(e.target as Node)) {
        setShowSugg(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Rândul principal: search + chips + dropdowns */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Căutare cu autocomplete */}
        <div
          data-search-wrapper
          style={{ flex: 1, minWidth: 220, position: 'relative' }}
        >
          <input
            ref={searchRef}
            className="form-input"
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { onSearchChange(e.target.value); setShowSugg(true) }}
            onFocus={() => { if (searchQuery) setShowSugg(true) }}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (showSugg && filteredSugg.length > 0) onSearchChange(filteredSugg[0])
                setShowSugg(false)
              } else if (e.key === 'Escape') {
                setShowSugg(false)
              }
            }}
            style={{ width: '100%', paddingRight: searchQuery ? 32 : undefined }}
            aria-label="Câmp de căutare"
          />
          {/* Buton X pentru ștergere rapidă */}
          {searchQuery && (
            <button
              type="button"
              onClick={() => { onSearchChange(''); setShowSugg(false) }}
              aria-label="Șterge căutarea"
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 14, padding: 2,
              }}
            >
              ✕
            </button>
          )}
          {/* Dropdown sugestii */}
          {showSugg && filteredSugg.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
              background: 'var(--bg-primary)', border: '1px solid var(--border-medium)',
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden',
            }}>
              {filteredSugg.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => { onSearchChange(s); setShowSugg(false) }}
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

        {/* Chips de filtru rapid */}
        {chips && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {chips.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => chips.onChange(opt.value)}
                className={chips.activeValue === opt.value ? 'btn btn-secondary' : 'btn btn-ghost'}
                style={{ fontSize: 12, padding: '6px 12px' }}
                aria-pressed={chips.activeValue === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown-uri adiționale */}
        {dropdowns.map((dd) => (
          <select
            key={dd.id}
            className="form-input form-select"
            value={dd.value}
            onChange={(e) => dd.onChange(e.target.value)}
            style={{ width: 'auto', minWidth: 150 }}
            aria-label={dd.placeholder}
          >
            <option value="">{dd.placeholder}</option>
            {dd.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}

        {/* Dropdown sortare */}
        {sortOptions && onSortChange && (
          <select
            className="form-input form-select"
            value={sortValue ?? ''}
            onChange={(e) => onSortChange(e.target.value)}
            style={{ width: 'auto', minWidth: 140 }}
            aria-label="Sortare"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Rândul secundar: counter + reset */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{resultsCount}</strong>{' '}
          {resultsLabel}
          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              style={{
                marginLeft: 10, fontSize: 11, color: 'var(--primary)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              ✕ Resetează filtrele
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
