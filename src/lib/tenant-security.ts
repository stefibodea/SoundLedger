import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { SessionPayload } from '@/lib/session'

export class TenantSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantSecurityError'
  }
}

export async function assertArtistBelongsToLabel(
  artistId: string,
  labelId: string,
  redirectTo = '/dashboard',
): Promise<void> {
  if (!artistId) redirect(redirectTo)
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { labelId: true },
  })
  if (!artist || artist.labelId !== labelId) redirect(redirectTo)
}

export async function assertTrackBelongsToLabel(
  trackId: string,
  labelId: string,
  redirectTo = '/dashboard',
): Promise<void> {
  if (!trackId) redirect(redirectTo)
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { labelId: true },
  })
  if (!track || track.labelId !== labelId) redirect(redirectTo)
}
