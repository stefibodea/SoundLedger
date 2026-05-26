import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { TeamPageClient, type ComposerRow } from './team-client'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/team')
  if (!session.labelId || !canManageTeam(session.role)) {
    redirect('/dashboard')
  }

  const composers = await prisma.composer.findMany({
    where: { labelId: session.labelId },
    orderBy: { name: 'asc' },
  })

  const composerRows: ComposerRow[] = composers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    specialization: c.specialization,
    photo: c.photo,
  }))

  return (
    <AppShell session={session}>
      <TeamPageClient
        composers={composerRows}
        canManage={canManageTeam(session.role)}
      />
    </AppShell>
  )
}
