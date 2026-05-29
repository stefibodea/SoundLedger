import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageReleases } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ReleasesClient, type ReleaseRow } from './releases-client'

export default async function ReleasesPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/releases')
  if (!session.labelId || !canManageReleases(session.role)) redirect('/dashboard')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const rawReleases = await prisma.release.findMany({
    where: { labelId: session.labelId },
    include: {
      track: { include: { artist: { select: { name: true, photo: true } } } },
    },
    orderBy: { releaseDate: 'asc' },
  })

  const totalReleases   = rawReleases.length
  const releasedCount   = rawReleases.filter((r) => r.status === 'RELEASED').length
  const overdueCount    = rawReleases.filter((r) =>
    r.status !== 'RELEASED' && new Date(r.releaseDate) < todayStart,
  ).length
  const planningCount   = rawReleases.filter((r) => r.status === 'PLANNING').length

  const releases: ReleaseRow[] = rawReleases.map((r) => ({
    id:           r.id,
    status:       r.status,
    releaseDate:  r.releaseDate,
    checklist:    r.checklist,
    track: r.track
      ? { id: r.trackId ?? '', title: r.track.title, artist: { name: r.track.artist.name, photo: r.track.artist.photo ?? null } }
      : null,
  }))

  return (
    <AppShell session={session} title="Lansări">

      <ReleasesClient releases={releases} />

      <KpiVinylSidebar kpis={[
        { value: totalReleases, label: 'Total',             accentColor: 'purple' },
        { value: releasedCount, label: 'Lansate',           accentColor: 'green' },
        { value: overdueCount,  label: 'Trecute de termen', accentColor: overdueCount  > 0 ? 'red' : 'gray' },
        { value: planningCount, label: 'Planificate',       accentColor: 'blue' },
      ]} />

    </AppShell>
  )
}
