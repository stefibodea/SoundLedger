import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewArtists, canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ArtistsClient, type ArtistRow } from './artists-client'

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/artists')
  if (!session.labelId || !canViewArtists(session.role)) redirect('/dashboard')
  const canManage = canManageArtists(session.role)

  const params = await searchParams
  const error  = params.error

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [rawArtists, addedThisMonth, withContract] = await Promise.all([
    // Fără take — afișăm toți artiștii (paginarea e client-side)
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'EXPIRING'] } },
          select: { id: true, status: true, royaltyPercent: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { tracks: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.artist.count({
      where: { labelId: session.labelId, createdAt: { gte: startOfMonth } },
    }),
    prisma.artist.count({
      where: {
        labelId: session.labelId,
        contracts: { some: { status: { in: ['ACTIVE', 'EXPIRING'] } } },
      },
    }),
  ])

  const totalArtists   = rawArtists.length
  const withoutContract = totalArtists - withContract

  // Genuri unice pentru dropdown de filtru
  const genreOptions = [...new Set(rawArtists.map((a) => a.genre))].sort((a, b) =>
    a.localeCompare(b, 'ro'),
  )

  // Serializare Date string (Server Client Component)
  const artists: ArtistRow[] = rawArtists.map((a) => ({
    id:       a.id,
    name:     a.name,
    realName: a.realName,
    genre:    a.genre,
    photo:    a.photo,
    instagram: a.instagram,
    createdAt: a.createdAt.toISOString(),
    _count:   { tracks: a._count.tracks },
    contracts: a.contracts.map((c) => ({
      id:             c.id,
      status:         c.status,
      royaltyPercent: c.royaltyPercent,
    })),
  }))

  return (
    <AppShell session={session} title="Artiști">

      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(error)}</p>
        </div>
      )}

      {/* ── Client Component: KPI + filtre + tabel/grid + modal ──────────── */}
      <ArtistsClient
        artists={artists}
        genreOptions={genreOptions}
        totalArtists={totalArtists}
        withContract={withContract}
        addedThisMonth={addedThisMonth}
        withoutContract={withoutContract}
        canManage={canManage}
      />

    </AppShell>
  )
}
