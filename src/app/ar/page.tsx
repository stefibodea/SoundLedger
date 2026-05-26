import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
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
    source:     p.source,
    createdAt:  p.createdAt.toISOString(),
  }))

  const total       = rawProspects.length
  const signed      = rawProspects.filter((p) => p.status === 'SIGNED').length
  const negotiation = rawProspects.filter((p) => p.status === 'NEGOTIATION').length
  const rejected    = rawProspects.filter((p) => p.status === 'REJECTED').length
  const withScore   = rawProspects.filter((p) => p.aiScore != null)
  const avgScore    = withScore.length > 0
    ? Math.round(withScore.reduce((s, p) => s + (p.aiScore ?? 0), 0) / withScore.length)
    : null

  return (
    <AppShell session={session}>

      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(errorMsg.replace(/\+/g, ' '))}</p>
        </div>
      )}

      {/* ── Client Component: filtre + kanban + modal ────────────────────── */}
      <ARClient prospects={prospects} />

      <KpiVinylSidebar kpis={[
        { value: total,       label: 'Candidați', accentColor: 'purple' },
        { value: signed,      label: 'Semnați',   accentColor: 'green' },
        { value: negotiation, label: 'Negociere', accentColor: 'yellow' },
        { value: rejected,    label: 'Respinși',  accentColor: rejected > 0 ? 'red' : 'gray' },
      ]} />

    </AppShell>
  )
}
