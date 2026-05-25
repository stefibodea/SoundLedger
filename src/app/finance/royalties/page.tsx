import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewFinance, canManageFinance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { RoyaltiesClient } from './royalties-client'
import type { RoyaltyRow } from './royalties-client'

export default async function RoyaltiesPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/finance/royalties')
  if (!session.labelId || !canViewFinance(session.role)) redirect('/dashboard')

  const rawRoyalties = await prisma.royaltyPayment.findMany({
    where: { labelId: session.labelId },
    include: {
      artist: { select: { id: true, name: true, photo: true } },
      revenue: { select: { id: true, source: true, period: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pending = rawRoyalties.filter((r) => r.status === 'PENDING')
  const paid    = rawRoyalties.filter((r) => r.status === 'PAID')
  const pendingSum = pending.reduce((s, r) => s + r.amount, 0)
  const paidSum    = paid.reduce((s, r) => s + r.amount, 0)
  const totalSum   = rawRoyalties.reduce((s, r) => s + r.amount, 0)

  const royalties: RoyaltyRow[] = rawRoyalties.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt?.toISOString() ?? null,
  }))

  const fmtEur = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`

  return (
    <AppShell session={session} title="Royalty Payments">
      <div style={{ marginBottom: 16 }}>
        <Link href="/finance" className="btn btn-secondary" style={{ fontSize: 13 }}>
          Înapoi la finanțe
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="În așteptare"
          value={pending.length}
          accentColor="yellow"
          subtitle={`${pendingSum.toFixed(2)} €`}
        />
        <KPICard
          label="Plătite"
          value={paid.length}
          accentColor="green"
          subtitle={`${paidSum.toFixed(2)} €`}
        />
        <KPICard
          label="Total plăți"
          value={rawRoyalties.length}
          accentColor="blue"
        />
        <KPICard
          label="Sumă totală"
          value={fmtEur(totalSum)}
          accentColor="purple"
        />
      </div>

      <RoyaltiesClient royalties={royalties} canManage={canManageFinance(session.role)} />
    </AppShell>
  )
}
