import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getArtistProfile } from '@/lib/artist-profile'
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

// ── Helpers for ARTIST role ────────────────────────────────────────────────

/**
 * Resolves the artist profile for the logged-in ARTIST-role user and
 * redirects if not found. Use this at the top of every ARTIST-only action
 * instead of accepting an artistId from formData.
 */
export async function requireOwnArtistProfile(
  session: SessionPayload,
  redirectTo = '/dashboard',
) {
  const artist = await getArtistProfile(session)
  if (!artist) redirect(redirectTo)
  return artist
}

/**
 * Verifies that a track belongs to the artist's own profile.
 * Use after requireOwnArtistProfile when the action accepts a trackId.
 */
export async function assertTrackBelongsToOwnArtist(
  trackId: string,
  artistId: string,
  redirectTo = '/dashboard',
): Promise<void> {
  if (!trackId) redirect(redirectTo)
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { artistId: true },
  })
  if (!track || track.artistId !== artistId) redirect(redirectTo)
}

/**
 * Verifies that a contract belongs to the artist's own profile.
 * Use after requireOwnArtistProfile when the action accepts a contractId.
 */
export async function assertContractBelongsToOwnArtist(
  contractId: string,
  artistId: string,
  redirectTo = '/dashboard',
): Promise<void> {
  if (!contractId) redirect(redirectTo)
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { artistId: true },
  })
  if (!contract || contract.artistId !== artistId) redirect(redirectTo)
}
