import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { RecoupmentClient, type ArtistFinanceRow } from './recoupment-client'

export default async function RecoupmentPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance/recoupment')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const [artists, generalExpenses] = await Promise.all([
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      include: {
        contracts: {
          select: { advance: true, royaltyPercent: true, status: true },
        },
        royaltyPayments: {
          where: { status: 'PAID' },
          select: { amount: true },
        },
        revenues: {
          select: { amount: true },
        },
        expenses: {
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.expense.aggregate({
      where: { labelId: session.labelId, artistId: null },
      _sum: { amount: true },
    }),
  ])

  const totalCheltuieliGenerale = generalExpenses._sum.amount ?? 0

  const rows: ArtistFinanceRow[] = artists.map((a) => {
    const totalAvans            = a.contracts.reduce((s, c) => s + (c.advance ?? 0), 0)
    const totalRoyaltyPlati     = a.royaltyPayments.reduce((s, r) => s + r.amount, 0)
    const totalVenituri         = a.revenues.reduce((s, r) => s + r.amount, 0)
    const totalCheltuieliDirect = a.expenses.reduce((s, e) => s + e.amount, 0)
    const soldRecoupment        = totalAvans - totalRoyaltyPlati
    const totalCheltuieli       = totalAvans + totalRoyaltyPlati + totalCheltuieliDirect
    const profitNet             = totalVenituri - totalCheltuieli

    let status: ArtistFinanceRow['status']
    if (totalAvans === 0)        status = 'FARA_AVANS'
    else if (soldRecoupment > 0) status = 'NERECUPERAT'
    else                         status = 'RECUPERAT'

    return {
      id:              a.id,
      name:            a.name,
      photo:           a.photo,
      genre:           a.genre,
      totalAvans,
      totalRoyaltyPlati,
      soldRecoupment,
      totalVenituri,
      totalCheltuieli,
      profitNet,
      status,
    }
  })

  const totalArtisti     = rows.length
  const totalVenituri    = Math.round(rows.reduce((s, r) => s + r.totalVenituri, 0))
  const totalCheltuieli  = Math.round(rows.reduce((s, r) => s + r.totalCheltuieli, 0) + totalCheltuieliGenerale)
  const profitNet        = Math.round(totalVenituri - totalCheltuieli)

  function kFmt(n: number) {
    const abs = Math.abs(n)
    if (abs >= 1000) return `${(n / 1000).toFixed(1)}k €`
    return `${n} €`
  }

  return (
    <AppShell session={session} title="Profit & Pierderi">
      <RecoupmentClient rows={rows} />

      <KpiVinylSidebar kpis={[
        { value: totalArtisti,          label: 'Artiști analizați', accentColor: 'purple' },
        { value: kFmt(totalVenituri),   label: 'Venituri totale',   accentColor: totalVenituri > 0 ? 'green' : 'gray' },
        { value: kFmt(totalCheltuieli), label: 'Cheltuieli totale', accentColor: totalCheltuieli > 0 ? 'red' : 'gray' },
        {
          value: (profitNet > 0 ? '+' : '') + kFmt(profitNet),
          label: 'Profit net',
          accentColor: profitNet > 0 ? 'green' : profitNet < 0 ? 'red' : 'gray',
        },
      ]} />
    </AppShell>
  )
}
