import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { RevenueCharts } from '@/components/revenue-charts'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { createRevenueAction } from '@/app/actions/revenues'
import { generateFinanceReportAction } from '@/app/actions/ai'
import { enforceOnboarding } from '@/lib/onboarding'

const SOURCE_LABELS: Record<string, string> = {
  STREAMING:   'Spotify',
  YOUTUBE:     'YouTube',
  APPLE_MUSIC: 'Apple Music',
  LICENSING:   'Licențiere',
  PHYSICAL:    'Vânzări fizice',
  SYNC:        'Sync',
}

const SOURCE_STYLES: Record<string, { bg: string; color: string }> = {
  STREAMING:   { bg: '#dcfce7',                       color: '#15803d' },
  YOUTUBE:     { bg: '#fee2e2',                       color: '#b91c1c' },
  APPLE_MUSIC: { bg: '#fce7f3',                       color: '#be185d' },
  LICENSING:   { bg: 'var(--role-label-light)',        color: 'var(--role-label-dark)' },
  PHYSICAL:    { bg: 'var(--bg-tertiary)',             color: 'var(--text-secondary)' },
  SYNC:        { bg: 'var(--role-finance-light)',      color: 'var(--role-finance-dark)' },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function FinancePage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const params     = (await searchParams) ?? {}
  const errorMsg   = typeof params.error      === 'string' ? params.error      : null
  const filterSrc  = typeof params.source     === 'string' ? params.source     : ''
  const filterArt  = typeof params.artistId   === 'string' ? params.artistId   : ''
  const periodFrom = typeof params.periodFrom === 'string' ? params.periodFrom : ''
  const periodTo   = typeof params.periodTo   === 'string' ? params.periodTo   : ''

  const hasFilters = filterSrc || filterArt || periodFrom || periodTo

  // Build filtered where clause
  const filteredWhere: Record<string, unknown> = { labelId: session.labelId }
  if (filterSrc) filteredWhere.source   = filterSrc
  if (filterArt) filteredWhere.artistId = filterArt
  if (periodFrom || periodTo) {
    const pf: Record<string, string> = {}
    if (periodFrom) pf.gte = periodFrom
    if (periodTo)   pf.lte = periodTo
    filteredWhere.period = pf
  }

  // Latest AI finance report for this user
  const latestAiReport = await prisma.notification.findFirst({
    where: { userId: session.userId, type: 'AI_FINANCE' },
    orderBy: { createdAt: 'desc' },
  })

  const [allRevenues, filteredRevenues, artists] = await Promise.all([
    // All revenues — for charts and per-artist summary
    prisma.revenue.findMany({
      where: { labelId: session.labelId },
      include: { artist: true },
      orderBy: { period: 'asc' },
    }),
    // Filtered revenues — for the table
    prisma.revenue.findMany({
      where: filteredWhere,
      include: { artist: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalAll      = allRevenues.reduce((s, r) => s + r.amount, 0)
  const totalFiltered = filteredRevenues.reduce((s, r) => s + r.amount, 0)

  // KPI: luna curentă
  const currentPeriod = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const thisMonthTotal = allRevenues
    .filter((r) => r.period === currentPeriod)
    .reduce((s, r) => s + r.amount, 0)

  // Chart data: monthly aggregation (from all revenues)
  const monthlyMap = new Map<string, number>()
  for (const r of allRevenues) {
    monthlyMap.set(r.period, (monthlyMap.get(r.period) ?? 0) + r.amount)
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([period, total]) => ({ period, total }))

  // Chart data: by source
  const sourceMap = new Map<string, number>()
  for (const r of allRevenues) {
    sourceMap.set(r.source, (sourceMap.get(r.source) ?? 0) + r.amount)
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total)

  // KPI: sursa dominantă
  const dominantSource = bySource.length > 0 ? bySource[0] : null

  // Per-artist summary
  const artistMap = new Map<string, { name: string; total: number; count: number }>()
  for (const r of allRevenues) {
    const key  = r.artistId ?? '__none__'
    const name = r.artist?.name ?? '(fără artist)'
    const cur  = artistMap.get(key) ?? { name, total: 0, count: 0 }
    artistMap.set(key, { name, total: cur.total + r.amount, count: cur.count + 1 })
  }
  const perArtist = Array.from(artistMap.values()).sort((a, b) => b.total - a.total)

  // Export URL with current filters
  const exportParams = new URLSearchParams()
  if (filterSrc)  exportParams.set('source',     filterSrc)
  if (filterArt)  exportParams.set('artistId',   filterArt)
  if (periodFrom) exportParams.set('periodFrom', periodFrom)
  if (periodTo)   exportParams.set('periodTo',   periodTo)
  const exportUrl = `/api/finance/export?${exportParams.toString()}`

  const canManage = canManageFinance(session.role)

  return (
    <AppShell session={session} title="Royalties & Finanțe">
      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(errorMsg.replace(/\+/g, ' '))}</p>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Total venituri"
          value={`${totalAll.toFixed(2)} €`}
          accentColor="green"
        />
        <KPICard
          label="Luna aceasta"
          value={`${thisMonthTotal.toFixed(2)} €`}
          accentColor={thisMonthTotal > 0 ? 'blue' : 'gray'}
        />
        <KPICard
          label="Sursa principală"
          value={dominantSource ? SOURCE_LABELS[dominantSource.source] ?? dominantSource.source : '—'}
          accentColor="purple"
          subtitle={dominantSource ? `${dominantSource.total.toFixed(0)} €` : undefined}
        />
        <KPICard
          label="Artiști cu venituri"
          value={perArtist.filter((a) => a.name !== '(fără artist)').length}
          accentColor="yellow"
        />
      </div>

      {/* Charts */}
      <RevenueCharts monthly={monthly} bySource={bySource} />

      {/* AI Finance Report */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>✦ Raport financiar AI</h3>
          <form action={generateFinanceReportAction}>
            <button className="btn btn-secondary" type="submit" style={{ fontSize: 13 }}>
              {latestAiReport ? '↻ Regenerează' : '✦ Generează raport'}
            </button>
          </form>
        </div>

        {latestAiReport ? (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Generat: {new Date(latestAiReport.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              {latestAiReport.message.split(/\n(?=\*\*)/).map((section, i) => {
                const titleMatch = section.match(/^\*\*(.+?)\*\*\n?/)
                const title = titleMatch?.[1] ?? ''
                const body  = section.replace(/^\*\*.+?\*\*\n?/, '').trim()
                if (!body) return null
                return (
                  <div key={i} style={{ borderLeft: '3px solid var(--role-finance-light)', paddingLeft: 12 }}>
                    {title && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--role-finance-dark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>}
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            Apasă "Generează raport" pentru o analiză AI a veniturilor: trend lunar, surse dominante, anomalii detectate și recomandări.
          </p>
        )}
      </section>

      {/* Add form — only for users who can manage */}
      {canManage && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Adaugă venit</h3>
          <form action={createRevenueAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="source">Sursă</label>
                <select className="form-input form-select" id="source" name="source" defaultValue="STREAMING">
                  <option value="STREAMING">Streaming (Spotify)</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="APPLE_MUSIC">Apple Music</option>
                  <option value="LICENSING">Licențiere</option>
                  <option value="PHYSICAL">Vânzări fizice</option>
                  <option value="SYNC">Sync</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="amount">Suma (€)</label>
                <input className="form-input" id="amount" name="amount" type="number" step="0.01" min="0.01" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="period">Perioadă</label>
                <input className="form-input" id="period" name="period" placeholder="ex: 2026-03" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="streams">Nr. streamuri (opțional)</label>
                <input className="form-input" id="streams" name="streams" type="number" min="0" placeholder="ex: 142500" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="artistId">Artist (opțional)</label>
                <select className="form-input form-select" id="artistId" name="artistId" defaultValue="">
                  <option value="">Fără artist specific</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="description">Descriere / notă contabilă (opțional)</label>
                <input className="form-input" id="description" name="description" placeholder="ex: Q1 2026 Spotify statement" />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Salvează venit</button>
          </form>
        </section>
      )}

      {/* Filter bar + export */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Istoric venituri</h3>
          <a href={exportUrl} className="btn btn-secondary" style={{ fontSize: 13 }}>
            ↓ Export CSV{hasFilters ? ' (filtrat)' : ''}
          </a>
        </div>

        <form method="GET" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0, flex: '0 0 160px' }}>
            <label className="form-label">Sursă</label>
            <select name="source" className="form-input form-select" defaultValue={filterSrc}>
              <option value="">Toate sursele</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: '0 0 180px' }}>
            <label className="form-label">Artist</label>
            <select name="artistId" className="form-input form-select" defaultValue={filterArt}>
              <option value="">Toți artiștii</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: '0 0 130px' }}>
            <label className="form-label">Perioadă de la</label>
            <input name="periodFrom" className="form-input" defaultValue={periodFrom} placeholder="2025-01" />
          </div>
          <div className="form-group" style={{ margin: 0, flex: '0 0 130px' }}>
            <label className="form-label">Perioadă până la</label>
            <input name="periodTo" className="form-input" defaultValue={periodTo} placeholder="2026-12" />
          </div>
          <button className="btn btn-secondary" type="submit" style={{ marginBottom: 1 }}>Filtrează</button>
          {hasFilters && (
            <Link href="/finance" className="btn btn-ghost" style={{ marginBottom: 1 }}>× Resetează</Link>
          )}
        </form>

        {hasFilters && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {filteredRevenues.length} rezultat{filteredRevenues.length !== 1 ? 'e' : ''} — total: <strong>{totalFiltered.toFixed(2)} €</strong>
          </p>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sursă</th>
                <th>Sumă</th>
                <th>Perioadă</th>
                <th>Artist</th>
                <th>Streamuri</th>
                <th>Descriere</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredRevenues.length === 0 ? (
                <tr><td colSpan={canManage ? 7 : 6}>Nu există venituri pentru filtrele selectate.</td></tr>
              ) : (
                filteredRevenues.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge" style={{
                        background: SOURCE_STYLES[r.source]?.bg ?? 'var(--bg-tertiary)',
                        color: SOURCE_STYLES[r.source]?.color ?? 'var(--text-secondary)',
                        fontSize: 12,
                      }}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                    </td>
                    <td><strong>{r.amount.toFixed(2)} €</strong></td>
                    <td>{r.period}</td>
                    <td style={{ fontSize: 13 }}>{r.artist?.name ?? '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {r.streams != null ? r.streams.toLocaleString('ro-RO') : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description ?? '—'}
                    </td>
                    {canManage && (
                      <td>
                        <Link href={`/finance/${r.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                          Editează
                        </Link>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-artist breakdown */}
      <section className="card">
        <h3 style={{ marginBottom: 16 }}>Venituri per artist</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Artist</th>
                <th>Total venituri</th>
                <th>Nr. înregistrări</th>
              </tr>
            </thead>
            <tbody>
              {perArtist.length === 0 ? (
                <tr><td colSpan={3}>Nu există date.</td></tr>
              ) : (
                perArtist.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td><strong>{a.total.toFixed(2)} €</strong></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{a.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
