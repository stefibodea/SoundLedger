'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { sendInvitationEmail } from '@/lib/mail'
import { inviteUserSchema } from '@/lib/schemas'

export async function inviteTeamMemberAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) {
    redirect('/dashboard')
  }

  const result = inviteUserSchema.safeParse({
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/team?error=${encodeURIComponent(msg)}`)
  }
  const { email, role } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    redirect('/team?error=Email+deja+folosit')
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: { email, labelId: session.labelId, acceptedAt: null, expiresAt: { gt: new Date() } },
  })
  if (existingInvite) {
    redirect('/team?error=Exista+deja+o+invitatie+activa+pentru+acest+email')
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

  const label = await prisma.label.findUnique({ where: { id: session.labelId }, select: { name: true } })

  const mail = await sendInvitationEmail({
    to: email,
    role,
    token,
    labelName: label?.name || 'SoundLedger',
  })

  const mailStatus = mail.sent ? 'ok' : 'mail_error'
  redirect(`/team?invite=${invitation.token}&mail=${mailStatus}`)
}

export async function revokeTeamInvitationAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) {
    redirect('/dashboard')
  }

  const invitationId = String(formData.get('invitationId') || '').trim()
  if (!invitationId) redirect('/team')

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.labelId !== session.labelId || invitation.acceptedAt) {
    redirect('/team?error=Invitatia+nu+poate+fi+revocata')
  }

  await prisma.invitation.delete({ where: { id: invitationId } })
  redirect('/team')
}
