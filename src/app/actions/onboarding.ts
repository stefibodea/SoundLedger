'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { sendInvitationEmail } from '@/lib/mail'
import { assertArtistBelongsToLabel } from '@/lib/tenant-security'

export async function createOnboardingTrackAction(formData: FormData) {
  const session = await requireSession()
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    redirect('/dashboard')
  }

  const title = String(formData.get('title') || '').trim()
  const genre = String(formData.get('genre') || '').trim()
  const artistId = String(formData.get('artistId') || '').trim()
  if (!title || !artistId) {
    redirect('/onboarding?error=Date+incomplete+pentru+piesa')
  }

  await assertArtistBelongsToLabel(artistId, session.labelId, '/onboarding?error=Artist+invalid')

  await prisma.track.create({
    data: {
      title,
      genre: genre || null,
      artistId,
      labelId: session.labelId,
      status: 'UNRELEASED',
      type: 'SINGLE',
    },
  })

  redirect('/onboarding')
}

export async function inviteOnboardingMemberAction(formData: FormData) {
  const session = await requireSession()
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    redirect('/dashboard')
  }

  const email = String(formData.get('email') || '').trim().toLowerCase()
  const role = String(formData.get('role') || '').trim()

  if (!email) {
    redirect('/onboarding?error=Date+incomplete+pentru+membru')
  }

  if (![ROLES.AR_MANAGER, ROLES.FINANCIAL].includes(role as never)) {
    redirect('/onboarding?error=Rol+invalid')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    redirect('/onboarding?error=Email+deja+folosit')
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      labelId: session.labelId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existingInvitation) {
    redirect('/onboarding?error=Exista+deja+o+invitatie+activa')
  }

  const token = randomBytes(24).toString('hex')
  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      labelId: session.labelId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: session.userId,
    },
  })

  const label = await prisma.label.findUnique({
    where: { id: session.labelId },
    select: { name: true },
  })

  const mail = await sendInvitationEmail({
    to: email,
    role,
    token,
    labelName: label?.name || 'SoundLedger',
  })

  const mailStatus = mail.sent ? 'ok' : 'smtp_missing'
  redirect(`/onboarding?invite=${invitation.token}&mail=${mailStatus}`)
}

export async function resendInvitationAction(formData: FormData) {
  const session = await requireSession()
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    redirect('/dashboard')
  }

  const invitationId = String(formData.get('invitationId') || '').trim()
  if (!invitationId) {
    redirect('/onboarding?error=Invitatie+invalida')
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (
    !invitation ||
    invitation.labelId !== session.labelId ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date()
  ) {
    redirect('/onboarding?error=Invitatia+nu+poate+fi+retrimisa')
  }

  const label = await prisma.label.findUnique({
    where: { id: session.labelId },
    select: { name: true },
  })

  const mail = await sendInvitationEmail({
    to: invitation.email,
    role: invitation.role,
    token: invitation.token,
    labelName: label?.name || 'SoundLedger',
  })

  redirect(`/onboarding?mail=${mail.sent ? 'resent' : 'smtp_missing'}`)
}

export async function revokeInvitationAction(formData: FormData) {
  const session = await requireSession()
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    redirect('/dashboard')
  }

  const invitationId = String(formData.get('invitationId') || '').trim()
  if (!invitationId) {
    redirect('/onboarding?error=Invitatie+invalida')
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation || invitation.labelId !== session.labelId || invitation.acceptedAt) {
    redirect('/onboarding?error=Invitatia+nu+poate+fi+revocata')
  }

  await prisma.invitation.delete({ where: { id: invitation.id } })
  redirect('/onboarding?invite=revoked')
}
