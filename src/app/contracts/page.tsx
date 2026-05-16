import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageContracts, canViewContracts } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ContractsClient, type ContractRow, type ArtistOption } from './contracts-client'

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

  const [rawContracts, rawArtists] = await Promise.all([
    prisma.contract.findMany({
      where: { labelId: session.labelId },
      include: { artist: { select: { id: true, name: true, photo: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const activeCount      = rawContracts.filter((c) => c.status === 'ACTIVE').length
  const expiringCount    = rawContracts.filter((c) => c.status === 'EXPIRING').length
  const draftCount       = rawContracts.filter((c) => c.status === 'DRAFT').length
  const negotiationCount = rawContracts.filter((c) => c.status === 'NEGOTIATION').length

  const contracts: ContractRow[] = rawContracts.map((c) => ({
    id:             c.id,
    status:         c.status,
    royaltyPercent: c.royaltyPercent,
    advance:        c.advance ? Number(c.advance) : null,
    duration:       c.duration,
    startDate:      c.startDate ?? null,
    endDate:        c.endDate   ?? null,
    aiAnalysis:     c.aiAnalysis,
    createdAt:      c.createdAt.toISOString(),
    artist: {
      id:    c.artist.id,
      name:  c.artist.name,
      photo: c.artist.photo,
    },
  }))

  const artists: ArtistOption[] = rawArtists.map((a) => ({ id: a.id, name: a.name }))

  return (
    <AppShell session={session} title="Contracte">

      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>⚠️ {decodeURIComponent(error)}</p>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Contracte active"
          value={activeCount}
          accentColor="green"
        />
        <KPICard
          label="Expiră curând"
          value={expiringCount}
          accentColor={expiringCount > 0 ? 'yellow' : 'gray'}
        />
        <KPICard
          label="Draft-uri"
          value={draftCount}
          accentColor="blue"
        />
        <KPICard
          label="În negociere"
          value={negotiationCount}
          accentColor="purple"
        />
      </div>

      {/* ── Client Component: filtre + tabel + modal ──────────────────────── */}
      <ContractsClient
        contracts={contracts}
        artists={artists}
        canManage={canManageContracts(session.role)}
      />

    </AppShell>
  )
}
