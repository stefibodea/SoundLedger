import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canUseScouting } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ARClient, type ProspectRow } from './ar-client'

export default async function ARPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/ar')
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const params   = (await searchParams) ?? {}
  const errorMsg = typeof params.error === 'string' ? params.error : null

  const rawProspects = await prisma.aRProspect.findMany({
    where: { labelId: session.labelId },
    orderBy: { createdAt: 'desc' },
  })

  const prospects: ProspectRow[] = rawProspects.map((p) => ({
    id:         p.id,
    name:       p.name,
    status:     p.status,
    aiScore:    p.aiScore,
    notes:      p.notes,
    instagram:  p.instagram,
    spotifyUrl: p.spotifyUrl,
    youtubeUrl: p.youtubeUrl,
    createdAt:  p.createdAt.toISOString(),
  }))

  return (
    <AppShell session={session} title="A&R Scouting">

      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(errorMsg.replace(/\+/g, ' '))}</p>
        </div>
      )}

      {/* ── Client Component: filtre + kanban/tabel + modal ───────────────── */}
      <ARClient prospects={prospects} />

    </AppShell>
  )
}
