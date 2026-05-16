'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { getArtistProfile } from '@/lib/artist-profile'

export async function requestProfileModificationAction() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST || !session.labelId) {
    redirect('/dashboard')
  }

  const [artist, label] = await Promise.all([
    getArtistProfile(session),
    prisma.label.findUnique({ where: { id: session.labelId }, select: { ownerId: true } }),
  ])

  if (!label) redirect('/dashboard')

  const artistName = artist?.name ?? 'Un artist'

  await prisma.notification.create({
    data: {
      userId: label.ownerId,
      message: `${artistName} a solicitat modificarea profilului său.`,
      type: 'INFO',
    },
  })

  redirect('/my-profile?success=Cererea+a+fost+trimisă+către+Label+Manager')
}

export async function requestContractRenegotiationAction() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST || !session.labelId) {
    redirect('/dashboard')
  }

  const [artist, label] = await Promise.all([
    getArtistProfile(session),
    prisma.label.findUnique({ where: { id: session.labelId }, select: { ownerId: true } }),
  ])

  if (!label) redirect('/dashboard')

  const artistName = artist?.name ?? 'Un artist'

  await prisma.notification.create({
    data: {
      userId: label.ownerId,
      message: `${artistName} a solicitat renegocierea contractului său.`,
      type: 'CONTRACT',
    },
  })

  redirect('/my-contract?success=Cererea+de+renegociere+a+fost+trimisă')
}
