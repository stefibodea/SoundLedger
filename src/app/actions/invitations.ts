'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'

export async function acceptInvitationAction(token: string, formData: FormData) {
  const firstName = String(formData.get('firstName') || '').trim()
  const lastName = String(formData.get('lastName') || '').trim()
  const password = String(formData.get('password') || '').trim()

  if (!firstName || !lastName || password.length < 6) {
    redirect(`/invite/${token}?error=Date+invalide`)
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    redirect('/login?error=Invitatia+nu+mai+este+valida')
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existingUser) {
    redirect('/login?error=Exista+deja+cont+pe+acest+email')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      labelId: invitation.labelId,
    },
  })

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  })

  await createSession(user.id, user.role, user.labelId ?? undefined)
  redirect('/dashboard')
}
