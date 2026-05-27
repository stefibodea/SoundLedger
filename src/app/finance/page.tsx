import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { createRevenueAction, importRevenueCsvAction } from '@/app/actions/revenues'
import { SuccessBanner } from './SuccessBanner'
import { AddRevenueForm } from './add-revenue-form'
import { enforceOnboarding } from '@/lib/onboarding'
import { FinanceClient, type RevenueRow, type ArtistOption } from './finance-client'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function FinancePage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const params        = (await searchParams) ?? {}
  const errorMsg      = typeof params.error   === 'string' ? params.error   : null
  const successType   = typeof params.success === 'string' ? params.success : null
  const successAmount = typeof params.amount  === 'string' ? params.amount  : null
  const successArtist = typeof params.artist  === 'string' ? decodeURIComponent(params.artist) : null
  const successPercent= typeof params.percent === 'string' ? params.percent : null
  const successCount  = typeof params.count   === 'string' ? params.count   : null
  const successTotal  = typeof params.total   === 'string' ? params.total   : null

  const canManage = canManageFinance(session.role)

  const [rawRevenues, rawArtists, royaltiesNeplatite] = await Promise.all([
    prisma.revenue.findMany({
      where: { labelId: session.labelId },
      include: { artist: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      orderBy: { name: 'asc' },
    }),
    prisma.royaltyPayment.aggregate({
      where: { labelId: session.labelId, status: 'PENDING' },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  // KPI sidebar
  const totalAll = rawRevenues.reduce((s, r) => s + r.amount, 0)
  const currentPeriod = new Date().toISOString().slice(0, 7)
  const thisMonthTotal = rawRevenues
    .filter((r) => r.period === currentPeriod)
    .reduce((s, r) => s + r.amount, 0)
  const sourceMap = new Map<string, number>()
  for (const r of rawRevenues) sourceMap.set(r.source, (sourceMap.get(r.source) ?? 0) + r.amount)
  const dominantSource = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1])[0] ?? null

  const revenues: RevenueRow[] = rawRevenues.map((r) => ({
    id:            r.id,
    source:        r.source,
    amount:        r.amount,
    streams:       r.streams,
    period:        r.period,
    description:   r.description,
    revenueStatus: r.revenueStatus,
    createdAt:     r.createdAt.toISOString(),
    artist:        r.artist ? { id: r.artist.id, name: r.artist.name } : null,
  }))

  const artists: ArtistOption[] = rawArtists.map((a) => ({ id: a.id, name: a.name }))

  return (
    <AppShell session={session}>
      <header className="page-header">
        <h1 className="page-title">Venituri</h1>
        {canManage && (
          <AddRevenueForm artists={rawArtists} createRevenueAction={createRevenueAction} importRevenueCsvAction={importRevenueCsvAction} />
        )}
      </header>

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
            <strong>Import finalizat cu succes!</strong> Au fost înregistrate <strong>{successCount} venituri</strong> în valoare totală de <strong>{successTotal} €</strong>, iar plățile de royalty aferente au fost calculate automat.
          </p>
        </div>
      )}

      <FinanceClient revenues={revenues} artists={artists} canManage={canManage} />

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
            ? (dominantSource[1] >= 1000 ? `${(dominantSource[1] / 1000).toFixed(1)}k €` : `${dominantSource[1].toFixed(0)} €`)
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
