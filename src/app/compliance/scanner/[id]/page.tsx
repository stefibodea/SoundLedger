import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { DetectionReportClient, type ParsedMatch } from './detection-report-client'

export default async function DetectionReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/scanner')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const { id } = await params

  const detection = await prisma.aIDetection.findFirst({
    where: { id, labelId: session.labelId },
  })

  if (!detection) notFound()

  // Fetch reporter name separately (no Prisma relation on reportedById)
  const reporter = detection.reportedById
    ? await prisma.user.findUnique({
        where:  { id: detection.reportedById },
        select: { firstName: true, lastName: true },
      })
    : null

  const matches: ParsedMatch[] = detection.matches ? JSON.parse(detection.matches) : []

  // Fetch top match track info
  const topTrack = matches[0]?.trackId
    ? await prisma.track.findFirst({
        where:   { id: matches[0].trackId, labelId: session.labelId },
        include: { artist: { select: { name: true } } },
      })
    : null

  return (
    <AppShell
      session={session}
      title="Raport detecție"
    >
      <DetectionReportClient
        detection={{
          id:               detection.id,
          suspectTitle:     detection.suspectTitle,
          suspectArtist:    detection.suspectArtist,
          platform:         detection.platform,
          suspectUrl:       detection.suspectUrl,
          suspectAudioFile: detection.suspectAudioFile,
          suspectDuration:  detection.suspectDuration,
          status:           detection.status,
          topMatchScore:    detection.topMatchScore,
          aiAnalysis:       detection.aiAnalysis,
          notes:            detection.notes,
          analyzedAt:       detection.analyzedAt?.toISOString() ?? null,
          createdAt:        detection.createdAt.toISOString(),
          reportedByName:   reporter
            ? `${reporter.firstName} ${reporter.lastName}`
            : null,
          hasError:         Boolean(detection.analysisError),
          analysisError:    detection.analysisError,
        }}
        matches={matches}
        topTrack={
          topTrack
            ? {
                id:         topTrack.id,
                title:      topTrack.title,
                audioFile:  topTrack.audioFile,
                artistName: topTrack.artist.name,
              }
            : null
        }
        canManage={canManageCompliance(session.role)}
      />
    </AppShell>
  )
}
