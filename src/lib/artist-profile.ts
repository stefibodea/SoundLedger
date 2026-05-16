import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { ROLES } from '@/lib/roles'

/**
 * Returneaza profilul de artist legat de user-ul curent (rol ARTIST).
 * Cauta mai intai dupa userId, apoi ca fallback dupa contactEmail.
 */
export async function getArtistProfile(session: SessionPayload) {
  if (session.role !== ROLES.ARTIST || !session.labelId) return null

  // Cauta legatura directa userId
  const byUserId = await prisma.artist.findFirst({
    where: { userId: session.userId, labelId: session.labelId },
  })
  if (byUserId) return byUserId

  // Fallback: cauta dupa email-ul de contact (util inainte de auto-link)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  })
  if (!user) return null

  return prisma.artist.findFirst({
    where: { contactEmail: user.email, labelId: session.labelId },
  })
}
