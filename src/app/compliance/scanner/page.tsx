import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { checkAudioServiceHealth } from '@/lib/audio-service'
import { ScannerClient, type DetectionRow } from './scanner-client'

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/scanner')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const params = await searchParams
  const error  = params.error

  const [rawDetections, serviceHealth, fingerprintCount] = await Promise.all([
    prisma.aIDetection.findMany({
      where:   { labelId: session.labelId },
      orderBy: { createdAt: 'desc' },
    }),
    checkAudioServiceHealth(),
    prisma.audioFingerprint.count({ where: { labelId: session.labelId } }),
  ])

  // Rezolvă numele pieselor din catalog pentru topMatchTrackId
  const topMatchIds = [...new Set(
    rawDetections
      .map((d) => d.topMatchTrackId)
      .filter((id): id is string => Boolean(id))
  )]

  const topMatchTracks = topMatchIds.length > 0
    ? await prisma.track.findMany({
        where:  { id: { in: topMatchIds }, labelId: session.labelId },
        select: { id: true, title: true, artist: { select: { name: true } } },
      })
    : []

  const trackNameMap = new Map(topMatchTracks.map((t) => [t.id, `${t.title} — ${t.artist.name}`]))
  const canManage    = canManageCompliance(session.role)

  // KPIs
  const totalCount     = rawDetections.length
  const pendingCount   = rawDetections.filter((d) => d.status === 'PENDING').length
  const confirmedCount = rawDetections.filter((d) => d.status === 'CONFIRMED').length
  const resolvedCount  = rawDetections.filter((d) => d.status === 'RESOLVED').length

  const detections: DetectionRow[] = rawDetections.map((d) => ({
    id:                d.id,
    suspectTitle:      d.suspectTitle,
    suspectArtist:     d.suspectArtist,
    platform:          d.platform,
    status:            d.status,
    topMatchScore:     d.topMatchScore,
    topMatchTrackName: d.topMatchTrackId ? (trackNameMap.get(d.topMatchTrackId) ?? null) : null,
    analyzedAt:        d.analyzedAt?.toISOString() ?? null,
    createdAt:         d.createdAt.toISOString(),
    hasError:          Boolean(d.analysisError),
  }))

  return (
    <AppShell
      session={session}
      title="🔍 Scanner piese suspecte"
    >
      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>
            ⚠️{' '}
            {error === 'catalog_empty'
              ? 'Catalogul nu are amprente audio calculate. Calculează din paginile pieselor înainte de a analiza.'
              : decodeURIComponent(error)}
          </p>
        </div>
      )}

      <ScannerClient
        detections={detections}
        canManage={canManage}
        serviceOnline={serviceHealth.ok}
        fingerprintCount={fingerprintCount}
      />

      <KpiVinylSidebar kpis={[
        { value: totalCount,     label: 'Total detecții', accentColor: 'purple' },
        { value: pendingCount,   label: 'În analiză',     accentColor: pendingCount > 0 ? 'yellow' : 'gray' },
        { value: confirmedCount, label: 'Confirmate',     accentColor: confirmedCount > 0 ? 'red' : 'gray' },
        { value: resolvedCount,  label: 'Rezolvate',      accentColor: 'green' },
      ]} />
    </AppShell>
  )
}
