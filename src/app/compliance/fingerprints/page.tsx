import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { FingerprintsClient, type FingerprintRow } from './fingerprints-client'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function FingerprintsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/fingerprints')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/dashboard')

  const params = await searchParams

  const resultParams = {
    completed: typeof params.completed === 'string' ? params.completed : null,
    failed:    typeof params.failed    === 'string' ? params.failed    : null,
    total:     typeof params.total     === 'string' ? params.total     : null,
    mode:      typeof params.mode      === 'string' ? params.mode      : null,
    success:   typeof params.success   === 'string' ? params.success   : null,
    error:     typeof params.error     === 'string' ? params.error     : null,
  }

  const tracks = await prisma.track.findMany({
    where:   { labelId: session.labelId },
    include: { artist: true, fingerprint: true },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total:              tracks.length,
    withAudio:          tracks.filter((t) => t.audioFile).length,
    withFingerprint:    tracks.filter((t) => t.fingerprint).length,
    missingFingerprint: tracks.filter((t) => t.audioFile && !t.fingerprint).length,
  }

  const items: FingerprintRow[] = tracks.map((t) => ({
    id:             t.id,
    title:          t.title,
    artistName:     t.artist.name,
    artistPhoto:    t.artist.photo ?? null,
    audioFile:      t.audioFile ?? null,
    hasAudio:       Boolean(t.audioFile),
    hasFingerprint: Boolean(t.fingerprint),
    computedAt:     t.fingerprint ? t.fingerprint.computedAt.toISOString() : null,
    tempo:          t.fingerprint ? t.fingerprint.tempo : null,
    duration:       t.fingerprint ? t.fingerprint.duration : null,
  }))

  return (
    <AppShell
      session={session}
      title="Fingerprints audio"
    >
      <FingerprintsClient
        items={items}
        canManage={canManageCompliance(session.role)}
        stats={stats}
        resultParams={resultParams}
      />
    </AppShell>
  )
}
