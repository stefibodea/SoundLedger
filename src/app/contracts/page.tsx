import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageContracts, canViewContracts } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ContractsClient, type ContractRow } from './contracts-client'

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/contracts')
  if (!session.labelId || !canViewContracts(session.role)) redirect('/dashboard')

  const params = await searchParams
  const error  = params.error

  const rawContracts = await prisma.contract.findMany({
    where: { labelId: session.labelId },
    include: { artist: { select: { id: true, name: true, photo: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const activeCount      = rawContracts.filter((c) => c.status === 'ACTIVE').length
  const expiringCount    = rawContracts.filter((c) => c.status === 'EXPIRING').length
  const negotiationCount = rawContracts.filter((c) => c.status === 'NEGOTIATION').length

  const contracts: ContractRow[] = rawContracts.map((c) => ({
    id:             c.id,
    status:         c.status,
    royaltyPercent: c.royaltyPercent,
    advance:        c.advance ? Number(c.advance) : null,
    duration:       c.duration,
    startDate:      c.startDate ?? null,
    endDate:        c.endDate   ?? null,
    createdAt:      c.createdAt.toISOString(),
    artist: {
      id:    c.artist.id,
      name:  c.artist.name,
      photo: c.artist.photo,
    },
  }))

  return (
    <AppShell session={session} title="Contracte">

      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>⚠️ {decodeURIComponent(error)}</p>
        </div>
      )}

      {/* ── Client Component: filtre + tabel + modal ──────────────────────── */}
      <ContractsClient
        contracts={contracts}
        canManage={canManageContracts(session.role)}
      />

      <KpiVinylSidebar kpis={[
        { value: rawContracts.length, label: 'Total',       accentColor: 'cyan' },
        { value: activeCount,         label: 'Active',      accentColor: 'green' },
        { value: expiringCount,       label: 'Expiră',      accentColor: expiringCount > 0 ? 'yellow' : 'gray' },
        { value: negotiationCount,    label: 'Negociere',   accentColor: 'purple' },
      ]} />

    </AppShell>
  )
}
