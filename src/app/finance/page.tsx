import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { RevenueCharts } from '@/components/revenue-charts'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { createRevenueAction, reconcileRevenueAction, importRevenueCsvAction } from '@/app/actions/revenues'
import { generateFinanceReportAction } from '@/app/actions/ai'
import { SuccessBanner } from './SuccessBanner'
import { AddRevenueForm } from './add-revenue-form'
import { enforceOnboarding } from '@/lib/onboarding'
import { AiReportPanel } from './ai-report-panel'

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YouTube Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV (CREDIDAM/UCMR-ADA)',
  SYNC_LICENSING:      'Sync Licensing',
  LICENTIERE:          'Licențiere',
  VANZARI_FIZICE:      'Vânzări fizice',
  MERCHANDISE:         'Merchandise',
  ALTE_SURSE:          'Alte surse',
  // legacy
  STREAMING:           'Spotify (legacy)',
  YOUTUBE:             'YouTube (legacy)',
  LICENSING:           'Licențiere (legacy)',
  PHYSICAL:            'Vânzări fizice (legacy)',
  SYNC:                'Sync (legacy)',
}

const SOURCE_STYLES: Record<string, { bg: string; color: string }> = {
  SPOTIFY:             { bg: '#dcfce7',                       color: '#15803d' },
  APPLE_MUSIC:         { bg: '#fce7f3',                       color: '#be185d' },
  YOUTUBE_MUSIC:       { bg: '#fee2e2',                       color: '#b91c1c' },
  YOUTUBE_CONTENT_ID:  { bg: '#fef9c3',                       color: '#854d0e' },
  TIKTOK:              { bg: '#f0f9ff',                       color: '#0369a1' },
  DEEZER:              { bg: '#ede9fe',                       color: '#6d28d9' },
  RADIO_TV:            { bg: 'var(--role-finance-light)',      color: 'var(--role-finance-dark)' },
  SYNC_LICENSING:      { bg: 'var(--role-ar-light)',           color: 'var(--role-ar-dark)' },
  LICENTIERE:          { bg: 'var(--role-label-light)',        color: 'var(--role-label-dark)' },
  VANZARI_FIZICE:      { bg: 'var(--bg-tertiary)',             color: 'var(--text-secondary)' },
  MERCHANDISE:         { bg: '#fdf2f8',                       color: '#9d174d' },
  ALTE_SURSE:          { bg: 'var(--bg-tertiary)',             color: 'var(--text-secondary)' },
  // legacy
  STREAMING:           { bg: '#dcfce7',                       color: '#15803d' },
  YOUTUBE:             { bg: '#fee2e2',                       color: '#b91c1c' },
  LICENSING:           { bg: 'var(--role-label-light)',        color: 'var(--role-label-dark)' },
  PHYSICAL:            { bg: 'var(--bg-tertiary)',             color: 'var(--text-secondary)' },
  SYNC:                { bg: 'var(--role-finance-light)',      color: 'var(--role-finance-dark)' },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function FinancePage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const params     = (await searchParams) ?? {}
  const errorMsg   = typeof params.error      === 'string' ? params.error      : null
  const successType   = typeof params.success === 'string' ? params.success    : null
  const successAmount = typeof params.amount  === 'string' ? params.amount     : null
  const successArtist = typeof params.artist  === 'string' ? decodeURIComponent(params.artist) : null
  const successPercent = typeof params.percent === 'string' ? params.percent   : null
  const successCount = typeof params.count   === 'string' ? params.count      : null
  const successTotal = typeof params.total   === 'string' ? params.total      : null
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

  // Royalties neplatite
  const royaltiesNeplatite = await prisma.royaltyPayment.aggregate({
    where: { labelId: session.labelId, status: 'PENDING' },
    _sum: { amount: true },
    _count: true,
  })

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

      {successType === 'royalty_generated' && successAmount && successArtist && successPercent && (
        <SuccessBanner amount={successAmount} artist={successArtist} percent={successPercent} />
      )}

      {successType === 'csv_imported' && successCount && successTotal && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #4ade80', padding: '14px 18px', background: 'rgba(74,222,128,0.06)' }}>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 500, fontSize: 14 }}>
            ✅ <strong>Import finalizat cu succes!</strong> Au fost înregistrate cu succes <strong>{successCount} venituri</strong> în valoare totală de <strong>{successTotal} €</strong>, iar plățile de royalty aferente au fost calculate și înregistrate automat!
          </p>
        </div>
      )}

      {/* Charts */}
      <RevenueCharts monthly={monthly} bySource={bySource} />

      {/* Royalties card */}
      <section className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Royalty Payments</h3>
          {royaltiesNeplatite._count > 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ color: '#fde68a', fontWeight: 600 }}>{royaltiesNeplatite._count} plăți în așteptare</span>
              {' '}·{' '}
              <span style={{ color: '#fde68a' }}>{(royaltiesNeplatite._sum.amount ?? 0).toFixed(2)} € de plătit</span>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Toate plățile sunt la zi.</p>
          )}
        </div>
        <Link href="/finance/royalties" className="btn btn-secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          Gestionează royalties →
        </Link>
      </section>

      {/* AI Finance Report */}
      <AiReportPanel
        latestAiReport={latestAiReport}
        generateFinanceReportAction={generateFinanceReportAction}
      />

      {/* Add form — only for users who can manage */}
      {canManage && (
        <AddRevenueForm artists={artists} createRevenueAction={createRevenueAction} />
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
            <input name="periodFrom" className="form-input" defaultValue={periodFrom} placeholder="2026-01" />
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
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Link href={`/finance/${r.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                            Editează
                          </Link>
                          {r.revenueStatus === 'ESTIMAT' && (
                            <form action={reconcileRevenueAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="id" value={r.id} />
                              <button
                                type="submit"
                                style={{
                                  fontSize: 11,
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  border: '1px solid rgba(110,231,183,0.3)',
                                  background: 'rgba(110,231,183,0.1)',
                                  color: '#6ee7b7',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Reconciliază
                              </button>
                            </form>
                          )}
                        </div>
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

      <KpiVinylSidebar kpis={[
        {
          value: totalAll >= 1000 ? `${(totalAll / 1000).toFixed(1)}k €` : `${totalAll.toFixed(0)} €`,
          label: 'Venituri', accentColor: 'green',
        },
        {
          value: thisMonthTotal >= 1000 ? `${(thisMonthTotal / 1000).toFixed(1)}k €` : `${thisMonthTotal.toFixed(0)} €`,
          label: 'Luna curentă', accentColor: thisMonthTotal > 0 ? 'blue' : 'gray',
        },
        {
          value: dominantSource
            ? (dominantSource.total >= 1000 ? `${(dominantSource.total / 1000).toFixed(1)}k €` : `${dominantSource.total.toFixed(0)} €`)
            : '—',
          label: 'Sursa principală', accentColor: 'purple',
        },
        {
          value: (() => { const v = royaltiesNeplatite._sum.amount ?? 0; return v >= 1000 ? `${(v / 1000).toFixed(1)}k €` : `${v.toFixed(0)} €` })(),
          label: 'Royalties', accentColor: royaltiesNeplatite._count > 0 ? 'yellow' : 'gray',
        },
      ]} />
    </AppShell>
  )
}
