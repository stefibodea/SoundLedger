import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { CheltuieliClient, type ExpenseRow, type ArtistOption } from './cheltuieli-client'

export default async function CheltuieliPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance/cheltuieli')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const sp = await searchParams
  const canManage = canManageFinance(session.role)

  const currentPeriod = new Date().toISOString().slice(0, 7)

  const [rawExpenses, rawArtists] = await Promise.all([
    prisma.expense.findMany({
      where: { labelId: session.labelId },
      include: { artist: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const totalCheltuieli    = rawExpenses.reduce((s, e) => s + e.amount, 0)
  const lunaAceasta        = rawExpenses.filter((e) => e.period === currentPeriod).reduce((s, e) => s + e.amount, 0)
  const totalRecuperabile  = rawExpenses.filter((e) => e.isRecoupable).reduce((s, e) => s + e.amount, 0)
  const nrInregistrari     = rawExpenses.length

  const expenses: ExpenseRow[] = rawExpenses.map((e) => ({
    id:          e.id,
    category:    e.category,
    amount:      e.amount,
    description: e.description,
    period:      e.period,
    isRecoupable: e.isRecoupable,
    createdAt:   e.createdAt.toISOString(),
    artist:      e.artist ? { id: e.artist.id, name: e.artist.name } : null,
  }))

  const artists: ArtistOption[] = rawArtists.map((a) => ({ id: a.id, name: a.name }))

  return (
    <AppShell session={session}>
      <CheltuieliClient
        expenses={expenses}
        artists={artists}
        canManage={canManage}
        success={sp.success}
        error={sp.error}
      />

      <KpiVinylSidebar kpis={[
        { value: totalCheltuieli  >= 1000 ? `${(totalCheltuieli  / 1000).toFixed(1)}k €` : `${Math.round(totalCheltuieli)} €`,  label: 'Total cheltuieli',  accentColor: 'red'    },
        { value: lunaAceasta      >= 1000 ? `${(lunaAceasta      / 1000).toFixed(1)}k €` : `${Math.round(lunaAceasta)} €`,      label: 'Luna aceasta',      accentColor: lunaAceasta > 0 ? 'yellow' : 'gray' },
        { value: totalRecuperabile >= 1000 ? `${(totalRecuperabile / 1000).toFixed(1)}k €` : `${Math.round(totalRecuperabile)} €`, label: 'Recuperabile',    accentColor: totalRecuperabile > 0 ? 'blue' : 'gray' },
        { value: nrInregistrari,                                                                                                   label: 'Înregistrări',    accentColor: 'purple' },
      ]} />
    </AppShell>
  )
}
