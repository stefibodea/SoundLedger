import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { RoyaltiesClient } from './royalties-client'
import { AddRoyaltyForm } from './add-royalty-form'
import type { RoyaltyRow, ArtistOption } from './royalties-client'

export default async function RoyaltiesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance/royalties')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const sp = await searchParams
  const canManage = canManageFinance(session.role)

  const [rawRoyalties, rawArtists] = await Promise.all([
    prisma.royaltyPayment.findMany({
      where: { labelId: session.labelId },
      include: {
        artist: { select: { id: true, name: true, photo: true } },
        revenue: { select: { id: true, source: true, period: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    canManage
      ? prisma.artist.findMany({
          where: { labelId: session.labelId },
          select: {
            id: true, name: true, photo: true,
            contracts: {
              where:  { labelId: session.labelId, status: { in: ['ACTIVE', 'EXPIRING'] } },
              select: { id: true, royaltyPercent: true },
              take:   1,
            },
          },
          orderBy: { name: 'asc' },
        })
      : [],
  ])

  const pending = rawRoyalties.filter((r) => r.status === 'PENDING')
  const paid    = rawRoyalties.filter((r) => r.status === 'PAID')
  const pendingSum = pending.reduce((s, r) => s + r.amount, 0)
  const paidSum    = paid.reduce((s, r) => s + r.amount, 0)
  const totalSum   = rawRoyalties.reduce((s, r) => s + r.amount, 0)

  const royalties: RoyaltyRow[] = rawRoyalties.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    paidAt:    r.paidAt?.toISOString() ?? null,
  }))

  const artistOptions: ArtistOption[] = rawArtists
    .filter((a) => a.contracts.length > 0)
    .map((a) => ({
      id:             a.id,
      name:           a.name,
      photo:          a.photo,
      contractId:     a.contracts[0].id,
      royaltyPercent: a.contracts[0].royaltyPercent,
    }))

  const fmtEur = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`

  return (
    <AppShell session={session}>
      <header className="page-header">
        <h1 className="page-title">Redevențe</h1>
        {canManage && artistOptions.length > 0 && (
          <AddRoyaltyForm artistOptions={artistOptions} />
        )}
      </header>
      <RoyaltiesClient
        royalties={royalties}
        canManage={canManage}
        artistOptions={artistOptions}
        success={sp.success}
        error={sp.error}
      />

      <KpiVinylSidebar kpis={[
        {
          value: pending.length,
          label: 'În așteptare',
          sublabel: `${pendingSum.toFixed(0)} €`,
          accentColor: pending.length > 0 ? 'yellow' : 'gray',
        },
        {
          value: paid.length,
          label: 'Plătite',
          sublabel: `${paidSum.toFixed(0)} €`,
          accentColor: 'green',
        },
        {
          value: rawRoyalties.length,
          label: 'Total plăți',
          accentColor: 'blue',
        },
        {
          value: fmtEur(totalSum),
          label: 'Sumă totală',
          accentColor: 'purple',
        },
      ]} />
    </AppShell>
  )
}
