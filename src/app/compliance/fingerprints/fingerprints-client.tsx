'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { KPICard } from '@/components/ui/KPICard'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  computeAllMissingFingerprintsAction,
  computeSelectedFingerprintsAction,
} from '@/app/actions/fingerprints'

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type FingerprintRow = {
  id: string
  title: string
  artistName: string
  artistPhoto: string | null
  audioFile: string | null
  hasAudio: boolean
  hasFingerprint: boolean
  computedAt: string | null
  tempo: number | null
  duration: number | null
}

type FilterType = 'all' | 'with-audio' | 'without-audio' | 'with-fp' | 'without-fp'

type Stats = {
  total: number
  withAudio: number
  withFingerprint: number
  missingFingerprint: number
}

type ResultParams = {
  completed: string | null
  failed: string | null
  total: string | null
  mode: string | null
  success: string | null
  error: string | null
}

type Props = {
  items: FingerprintRow[]
  canManage: boolean
  stats: Stats
  resultParams: ResultParams
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ── Icoane SVG ────────────────────────────────────────────────────────────────

function IconHeadphones() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function IconWaveform() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ── Badge-uri custom ──────────────────────────────────────────────────────────

function AudioBadge({ has }: { has: boolean }) {
  if (has) return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(56,189,248,0.10)',
      border: '1px solid rgba(56,189,248,0.30)',
      color: '#38bdf8',
      fontSize: 12, fontWeight: 600,
      boxShadow: '0 0 8px rgba(56,189,248,0.18)',
    }}>
      <IconHeadphones />
      Da
    </div>
  )
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: 'var(--text-tertiary)',
      fontSize: 12,
    }}>
      — Nu
    </div>
  )
}

function FingerprintBadge({ has, hasAudio }: { has: boolean; hasAudio: boolean }) {
  if (has) return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(56,189,248,0.10)',
      border: '1px solid rgba(56,189,248,0.30)',
      color: '#38bdf8',
      fontSize: 12, fontWeight: 600,
      boxShadow: '0 0 8px rgba(56,189,248,0.18)',
    }}>
      <IconWaveform />
      Calculat
    </div>
  )
  if (hasAudio) return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(252,165,165,0.10)',
      border: '1px solid rgba(252,165,165,0.28)',
      color: '#fca5a5',
      fontSize: 12, fontWeight: 600,
    }}>
      Lipsă
    </div>
  )
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: 'var(--text-tertiary)',
      fontSize: 12,
    }}>
      —
    </div>
  )
}

// ── Submit button cu loading ───────────────────────────────────────────────────

function SubmitBtn({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  const busy = pending || disabled
  return (
    <button
      type="submit"
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 18px', borderRadius: 8,
        background: busy ? 'rgba(155,148,240,0.3)' : 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
        color: 'white', fontWeight: 600, fontSize: 13,
        border: 'none', cursor: busy ? 'default' : 'pointer',
        transition: 'opacity 0.15s ease',
        fontFamily: 'inherit',
        boxShadow: busy ? 'none' : '0 0 12px rgba(56,189,248,0.25)',
      }}
    >
      {pending && (
        <span style={{
          width: 13, height: 13,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'fp-spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {pending ? 'Se procesează…' : label}
    </button>
  )
}

// ── Component principal ───────────────────────────────────────────────────────

export function FingerprintsClient({
  items,
  canManage,
  stats,
  resultParams,
}: Props) {
  const { completed, failed, total, mode, success, error } = resultParams

  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState<FilterType>('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [searchFocused, setSearchFocused] = useState(false)

  const masterCheckboxRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((row) => {
      if (q && !row.title.toLowerCase().includes(q) && !row.artistName.toLowerCase().includes(q)) return false
      if (filter === 'with-audio'    && !row.hasAudio)                          return false
      if (filter === 'without-audio' &&  row.hasAudio)                          return false
      if (filter === 'with-fp'       && !row.hasFingerprint)                    return false
      if (filter === 'without-fp'    && (row.hasFingerprint || !row.hasAudio))  return false
      return true
    })
  }, [items, search, filter])

  const visibleWithAudio     = filtered.filter((r) => r.hasAudio)
  const selectedVisibleCount = visibleWithAudio.filter((r) => selectedIds.has(r.id)).length
  const allVisibleSelected   = visibleWithAudio.length > 0 && selectedVisibleCount === visibleWithAudio.length
  const someVisibleSelected  = selectedVisibleCount > 0 && !allVisibleSelected

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  function toggleMaster() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visibleWithAudio.forEach((r) => next.delete(r.id))
      else                    visibleWithAudio.forEach((r) => next.add(r.id))
      return next
    })
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function switchMode(manual: boolean) {
    setSelectionMode(manual)
    if (!manual) setSelectedIds(new Set())
  }

  const hasActiveFilters = Boolean(search || filter !== 'all')
  const failedCount      = Number(failed ?? 0)
  const completedCount   = Number(completed ?? 0)
  const totalCount       = Number(total ?? 0)
  const hasResult        = completed !== null || failed !== null

  // ── Coloane tabel ──────────────────────────────────────────────────────────

  const checkboxCol: Column<FingerprintRow> = {
    key: 'select',
    header: (
      <input
        ref={masterCheckboxRef}
        type="checkbox"
        checked={allVisibleSelected}
        onChange={toggleMaster}
        disabled={visibleWithAudio.length === 0}
        style={{ cursor: 'pointer' }}
      />
    ) as unknown as string,
    width: '44px',
    render: (r) => (
      <input
        type="checkbox"
        checked={selectedIds.has(r.id)}
        disabled={!r.hasAudio}
        onChange={() => toggleRow(r.id)}
        style={{ cursor: r.hasAudio ? 'pointer' : 'default', opacity: r.hasAudio ? 1 : 0.3 }}
      />
    ),
  }

  const baseColumns: Column<FingerprintRow>[] = [
    {
      key: 'track',
      header: 'Piesă',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={r.artistName} imageUrl={r.artistPhoto} size={28} />
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {r.title}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {r.artistName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'audio',
      header: 'Audio',
      width: '110px',
      render: (r) => (
        <div style={{ textAlign: 'center' }}>
          <AudioBadge has={r.hasAudio} />
        </div>
      ),
    },
    {
      key: 'fingerprint',
      header: 'Fingerprint',
      width: '130px',
      render: (r) => (
        <div style={{ textAlign: 'center' }}>
          <FingerprintBadge has={r.hasFingerprint} hasAudio={r.hasAudio} />
        </div>
      ),
    },
    {
      key: 'tempo',
      header: 'Tempo / Durată',
      width: '160px',
      render: (r) =>
        r.tempo && r.duration ? (
          <span style={{ fontSize: 13, whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, Roboto Mono, Consolas, monospace' }}>
            {r.tempo.toFixed(1)} BPM · {fmtDuration(r.duration)}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>—</span>
        ),
    },
    {
      key: 'computedAt',
      header: 'Calculat',
      width: '120px',
      render: (r) =>
        r.computedAt ? (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, Roboto Mono, Consolas, monospace' }}>
            {fmtDate(r.computedAt)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
        ),
    },
    {
      key: 'details',
      header: 'Detalii',
      width: '160px',
      render: (r) => (
        <Link href={`/catalog/${r.id}`} className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
          Vezi piesa →
        </Link>
      ),
    },
  ]

  const columns = selectionMode ? [checkboxCol, ...baseColumns] : baseColumns

  // ── Opțiuni filtre ─────────────────────────────────────────────────────────

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all',           label: 'Toate' },
    { value: 'with-audio',    label: 'Cu audio' },
    { value: 'without-audio', label: 'Fără audio' },
    { value: 'with-fp',       label: 'Cu fingerprint' },
    { value: 'without-fp',    label: 'Necesită calcul' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes fp-spin {
          to { transform: rotate(360deg); }
        }
        .fp-table .table tbody tr {
          border-left: 3px solid transparent;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .fp-table .table tbody tr:hover {
          background: rgba(255,255,255,0.04);
          border-left: 3px solid #38bdf8;
        }
      `}</style>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Total piese"       value={stats.total}              accentColor="purple" />
        <KPICard label="Cu audio"          value={stats.withAudio}          accentColor="blue"
          subtitle={stats.total > 0 ? `${Math.round(stats.withAudio / stats.total * 100)}% din catalog` : undefined}
        />
        <KPICard label="Cu fingerprint"    value={stats.withFingerprint}    accentColor="green"
          subtitle={stats.withAudio > 0 ? `${Math.round(stats.withFingerprint / stats.withAudio * 100)}% din cu audio` : undefined}
        />
        <KPICard label="Lipsă fingerprint" value={stats.missingFingerprint} accentColor="yellow"
          subtitle={stats.missingFingerprint > 0 ? 'au audio, necesită calcul' : undefined}
        />
      </div>

      {/* Alerte rezultat */}
      {hasResult && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 8, fontSize: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background:  failedCount === 0 ? 'rgba(110,231,183,0.1)' : 'rgba(253,230,138,0.1)',
          border: `1px solid ${failedCount === 0 ? 'var(--role-ar-dark)' : 'var(--role-finance-dark)'}`,
          color: failedCount === 0 ? 'var(--role-ar-dark)' : 'var(--role-finance-dark)',
        }}>
          <span>
            {failedCount === 0
              ? `✓ Procesare completă${mode === 'manual' ? ' (selecție manuală)' : ''}: ${completedCount} piese procesate cu succes`
              : `⚠ Procesare parțială: ${completedCount} reușite, ${failedCount} eșuate din ${totalCount} total.`}
          </span>
          <Link href="/compliance/fingerprints" className="btn btn-ghost btn-sm" style={{ marginLeft: 12, fontSize: 16, lineHeight: 1 }}>
            ✕
          </Link>
        </div>
      )}

      {success === 'deleted' && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, fontSize: 14, background: 'rgba(110,231,183,0.1)', border: '1px solid var(--role-ar-dark)', color: 'var(--role-ar-dark)' }}>
          ✓ Fingerprint-ul a fost șters.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, fontSize: 14, background: 'rgba(252,165,165,0.1)', border: '1px solid var(--role-artist-dark)', color: 'var(--role-artist-dark)' }}>
          ⚠️ {decodeURIComponent(error)}
        </div>
      )}

      {/* Action Bar */}
      {canManage && (
        <div className="card" style={{ marginBottom: 20 }}>
          {/* Toggle mod */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[
              { manual: false, label: 'Deep Scan Missing' },
              { manual: true,  label: 'Force Resync' },
            ].map(({ manual, label }) => {
              const active = selectionMode === manual
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => switchMode(manual)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: active ? '1px solid rgba(56,189,248,0.5)' : '1px solid var(--border-light)',
                    background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                    color: active ? '#38bdf8' : 'var(--text-secondary)',
                    boxShadow: active ? '0 0 10px rgba(56,189,248,0.2), inset 0 0 8px rgba(56,189,248,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Modul automat */}
          {!selectionMode && (
            <div>
              <form action={computeAllMissingFingerprintsAction}>
                <SubmitBtn
                  label={`Scanează ${stats.missingFingerprint} piese lipsă`}
                  disabled={stats.missingFingerprint === 0}
                />
              </form>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                {stats.missingFingerprint > 0
                  ? `Durată estimată: ~${stats.missingFingerprint * 2}s`
                  : '✓ Toate piesele cu audio au fingerprint calculat.'}
              </p>
            </div>
          )}

          {/* Modul selecție manuală */}
          {selectionMode && (
            <div>
              <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Bifează piesele pentru recalcul forțat. Suprascrie fingerprintul existent.
              </p>
              <form action={computeSelectedFingerprintsAction}>
                {Array.from(selectedIds).map((id) => (
                  <input key={id} type="hidden" name="trackIds" value={id} />
                ))}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <SubmitBtn
                    label={`Resync ${selectedIds.size} ${selectedIds.size === 1 ? 'piesă' : 'piese'}`}
                    disabled={selectedIds.size === 0}
                  />
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Deselectează tot
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar custom */}
      <div style={{ marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: searchFocused ? '#38bdf8' : 'var(--text-tertiary)',
            pointerEvents: 'none',
            transition: 'color 0.15s ease',
          }}>
            <IconSearch />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Caută după titlu sau artist..."
            className="form-input"
            style={{
              paddingLeft: 36,
              borderColor: searchFocused ? 'rgba(56,189,248,0.6)' : undefined,
              boxShadow: searchFocused ? '0 0 0 3px rgba(56,189,248,0.12)' : undefined,
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          />
        </div>

        {/* Chips filtre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map((opt) => {
            const active = filter === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: active ? '1px solid rgba(56,189,248,0.5)' : '1px solid var(--border-light)',
                  background: active ? 'rgba(56,189,248,0.10)' : 'transparent',
                  color: active ? '#38bdf8' : 'var(--text-secondary)',
                  boxShadow: active ? '0 0 10px rgba(56,189,248,0.18), inset 0 0 6px rgba(56,189,248,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {opt.label}
              </button>
            )
          })}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-tertiary)' }}>
            {filtered.length} {filtered.length === 1 ? 'piesă' : 'piese'}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setFilter('all') }}
              style={{ fontSize: 12 }}
            >
              Resetează
            </button>
          )}
        </div>
      </div>

      {/* DataTable */}
      <section className="card fp-table">
        <DataTable
          key={`${filter}|${search}|${selectionMode}`}
          data={filtered}
          columns={columns}
          getRowKey={(r) => r.id}
          pageSize={25}
          emptyState={
            <EmptyState
              icon="🎵"
              title={items.length === 0 ? 'Niciun catalog' : 'Nicio piesă găsită'}
              description={
                items.length === 0
                  ? 'Adaugă piese în catalog pentru a începe.'
                  : 'Nicio piesă nu corespunde filtrelor curente.'
              }
              action={
                hasActiveFilters ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setSearch(''); setFilter('all') }}
                  >
                    Resetează filtrele
                  </button>
                ) : undefined
              }
            />
          }
        />
      </section>
    </>
  )
}
