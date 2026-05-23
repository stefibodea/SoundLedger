'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

// ── Tipuri ─────────────────────────────────────────────────────────────────────

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Lățime CSS opțională (ex: "40px", "auto") */
  width?: string
}

export type BulkAction<T> = {
  label: string
  onClick: (selectedItems: T[]) => void
  variant?: 'primary' | 'danger'
}

type Props<T> = {
  /** Datele deja filtrate și sortate de componenta părinte */
  data: T[]
  columns: Column<T>[]
  /** Cheie unică per rând */
  getRowKey: (row: T) => string
  /** Număr rânduri per pagină */
  pageSize?: number
  /** Acțiuni bulk — dacă există, adaugă coloana de checkbox */
  bulkActions?: BulkAction<T>[]
  /** Componentă afișată când `data` este gol */
  emptyState?: ReactNode
  /** Funcție apelată la click pe rând (opțional) */
  onRowClick?: (row: T) => void
}

const DEFAULT_PAGE_SIZE = 25

/**
 * Tabel generic cu paginare și selecție bulk.
 * Primește datele deja filtrate — nu gestionează filtrarea intern.
 */
export function DataTable<T>({
  data,
  columns,
  getRowKey,
  pageSize = DEFAULT_PAGE_SIZE,
  bulkActions,
  emptyState,
  onRowClick,
}: Props<T>) {
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const totalPages  = Math.max(1, Math.ceil(data.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows    = data.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // ── Handlers selecție ──────────────────────────────────────────────────────

  const toggleOne = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const toggleAll = () => {
    const pageKeys = pageRows.map(getRowKey)
    const allSelected = pageKeys.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) pageKeys.forEach((k) => next.delete(k))
      else             pageKeys.forEach((k) => next.add(k))
      return next
    })
  }

  const selectedItems = data.filter((r) => selected.has(getRowKey(r)))
  const hasBulk = Boolean(bulkActions?.length)
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(getRowKey(r)))

  // ── Empty state ────────────────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, margin: 0 }}>Nu există înregistrări.</p>
          </div>
        )}
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Bara bulk actions */}
      {hasBulk && selected.size > 0 && (
        <div className="card" style={{
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {selected.size} {selected.size === 1 ? 'element selectat' : 'elemente selectate'}
          </span>
          {bulkActions!.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.variant === 'danger' ? 'btn btn-ghost' : 'btn btn-primary'}
              style={action.variant === 'danger' ? { color: 'var(--role-artist-dark)', fontSize: 13 } : { fontSize: 13 }}
              onClick={() => action.onClick(selectedItems)}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelected(new Set())}
            style={{ fontSize: 12, color: 'var(--text-secondary)' }}
          >
            Anulează
          </button>
        </div>
      )}

      {/* Tabel */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {hasBulk && (
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    title="Selectează toate din pagina curentă"
                    aria-label="Selectează toate"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const key = getRowKey(row)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {hasBulk && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleOne(key)}
                        style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        aria-label={`Selectează rândul ${key}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} style={col.width ? { width: col.width } : undefined}>
                      {col.render(row)}
                    </td>
                  ))}
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
          marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Pagina {currentPage} din {totalPages} · {data.length} înregistrări
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button" className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
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
                    <button
                      key={p} type="button"
                      className={p === currentPage ? 'btn btn-secondary' : 'btn btn-ghost'}
                      style={{ fontSize: 12, padding: '6px 10px', minWidth: 32 }}
                      onClick={() => setPage(p as number)}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
              )}
            <button
              type="button" className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Următor →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
