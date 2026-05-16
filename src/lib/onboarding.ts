import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { ROLES } from '@/lib/roles'

export type OnboardingState = {
  hasProfile: boolean
  hasArtist: boolean
  hasTrack: boolean
  hasMember: boolean
  completed: boolean
}

export async function getOnboardingState(labelId: string): Promise<OnboardingState> {
  const [label, artistsCount, tracksCount, membersCount] = await Promise.all([
    prisma.label.findUnique({ where: { id: labelId }, select: { id: true } }),
    prisma.artist.count({ where: { labelId } }),
    prisma.track.count({ where: { labelId } }),
    prisma.user.count({ where: { labelId, role: { in: [ROLES.AR_MANAGER, ROLES.FINANCIAL] } } }),
  ])

  const hasProfile = Boolean(label)
  const hasArtist = artistsCount > 0
  const hasTrack = tracksCount > 0
  const hasMember = membersCount > 0

  return {
    hasProfile,
    hasArtist,
    hasTrack,
    hasMember,
    completed: hasProfile && hasArtist && hasTrack && hasMember,
  }
}

export async function enforceOnboarding(session: SessionPayload, currentPath: string) {
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    return
  }

  const state = await getOnboardingState(session.labelId)
  if (!state.completed && currentPath !== '/onboarding') {
    redirect('/onboarding')
  }
}
