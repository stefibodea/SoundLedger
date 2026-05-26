import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCatalog, canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { CatalogClient, type TrackRow, type ArtistOption } from './catalog-client'

type SearchParams = { artist?: string }

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/catalog')
  if (!session.labelId || !canViewCatalog(session.role)) redirect('/dashboard')

  const { artist: initialArtistFilter = '' } = await searchParams

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [rawTracks, label, rawArtists, albumsCount, releasedCount, addedThisMonth] = await Promise.all([
    prisma.track.findMany({
      where: { labelId: session.labelId },
      include: {
        artist:        { select: { id: true, name: true, photo: true } },
        creativeRecord: { select: { aiCompozitie: true, aiVersuri: true, aiVoce: true, aiProductie: true, aiAltele: true, rolesCompozitie: true, rolesVersuri: true, rolesProductie: true, rolesMixaj: true } },
        humanMadeCert: { select: { id: true, isRevoked: true, certificateCode: true, issuedAt: true, declaration: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.label.findUnique({ where: { id: session.labelId }, select: { name: true } }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.album.count({ where: { labelId: session.labelId } }),
    prisma.track.count({ where: { labelId: session.labelId, status: 'RELEASED' } }),
    prisma.track.count({ where: { labelId: session.labelId, createdAt: { gte: startOfMonth } } }),
  ])

  const totalTracks = rawTracks.length

  const tracks: TrackRow[] = rawTracks.map((t) => {
    const cr = t.creativeRecord
    let declaration: 'UMAN' | 'AI' | null = null
    if (cr) {
      const hasAI = cr.aiCompozitie || cr.aiVersuri || cr.aiVoce || cr.aiProductie || !!cr.aiAltele
      declaration = hasAI ? 'AI' : 'UMAN'
    }
    return {
      id:          t.id,
      title:       t.title,
      type:        t.type,
      status:      t.status,
      genre:       t.genre,
      isrc:        t.isrc,
      bpm:         t.bpm,
      duration:    t.duration,
      coverArt:    t.coverArt,
      createdAt:   t.createdAt.toISOString(),
      artist:      { id: t.artist.id, name: t.artist.name, photo: t.artist.photo ?? null },
      declaration,
      cert: t.humanMadeCert && !t.humanMadeCert.isRevoked
        ? {
            id:          t.humanMadeCert.id,
            code:        t.humanMadeCert.certificateCode,
            issuedAt:    t.humanMadeCert.issuedAt.toISOString(),
            declaration: t.humanMadeCert.declaration,
            rolesCompozitie: t.creativeRecord?.rolesCompozitie ?? null,
            rolesVersuri:    t.creativeRecord?.rolesVersuri    ?? null,
            rolesProductie:  t.creativeRecord?.rolesProductie  ?? null,
            rolesMixaj:      t.creativeRecord?.rolesMixaj      ?? null,
          }
        : null,
    }
  })

  const artists: ArtistOption[] = rawArtists.map((a) => ({ id: a.id, name: a.name }))

  const canWrite = canManageArtists(session.role)

  return (
    <AppShell session={session}>

      {/* ── Client Component: filtre + tabel + modal ──────────────────────── */}
      <CatalogClient
        tracks={tracks}
        artists={artists}
        canWrite={canWrite}
        labelName={label?.name ?? ''}
        initialArtistFilter={initialArtistFilter}
      />

      <KpiVinylSidebar kpis={[
        { value: totalTracks,    label: 'Piese',        accentColor: 'purple' },
        { value: releasedCount,  label: 'Lansate',      accentColor: 'green' },
        { value: albumsCount,    label: 'Albume',       accentColor: 'blue' },
        { value: addedThisMonth, label: 'Luna aceasta', accentColor: 'yellow' },
      ]} />

    </AppShell>
  )
}
