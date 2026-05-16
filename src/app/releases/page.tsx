import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageReleases } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ReleasesClient, type ReleaseRow, type TrackOption } from './releases-client'

export default async function ReleasesPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/releases')
  if (!session.labelId || !canManageReleases(session.role)) redirect('/dashboard')

  const today = new Date()
  const in30Days = new Date(today)
  in30Days.setDate(today.getDate() + 30)

  const [rawReleases, rawTracks] = await Promise.all([
    prisma.release.findMany({
      where: { labelId: session.labelId },
      include: {
        track: { include: { artist: { select: { name: true, photo: true } } } },
        album: { select: { id: true, title: true } },
      },
      orderBy: { releaseDate: 'asc' },
    }),
    prisma.track.findMany({
      where: { labelId: session.labelId },
      include: { artist: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const totalReleases   = rawReleases.length
  const releasedCount   = rawReleases.filter((r) => r.status === 'RELEASED').length
  const upcomingCount   = rawReleases.filter((r) =>
    r.status !== 'RELEASED' && new Date(r.releaseDate) <= in30Days,
  ).length
  const planningCount   = rawReleases.filter((r) => r.status === 'PLANNING').length

  const releases: ReleaseRow[] = rawReleases.map((r) => ({
    id:           r.id,
    status:       r.status,
    releaseDate:  r.releaseDate,
    pressRelease: r.pressRelease,
    checklist:    r.checklist,
    track: r.track
      ? { id: r.trackId ?? '', title: r.track.title, artist: { name: r.track.artist.name, photo: r.track.artist.photo ?? null } }
      : null,
    album: r.album ? { id: r.album.id, title: r.album.title } : null,
  }))

  const tracks: TrackOption[] = rawTracks.map((t) => ({
    id:    t.id,
    label: `${t.artist.name} — ${t.title}`,
  }))

  return (
    <AppShell session={session} title="Lansări">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Total lansări"
          value={totalReleases}
          accentColor="purple"
        />
        <KPICard
          label="Lansate"
          value={releasedCount}
          accentColor="green"
        />
        <KPICard
          label="Urmează (30 zile)"
          value={upcomingCount}
          accentColor={upcomingCount > 0 ? 'yellow' : 'gray'}
        />
        <KPICard
          label="În planificare"
          value={planningCount}
          accentColor="blue"
        />
      </div>

      {/* ── Client Component: filtre + carduri + modal ─────────────────────── */}
      <ReleasesClient releases={releases} tracks={tracks} />

    </AppShell>
  )
}
