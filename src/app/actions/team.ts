'use server'

import { randomBytes } from 'node:crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { sendInvitationEmail } from '@/lib/mail'
import { inviteUserSchema } from '@/lib/schemas'
import { saveAvatarFile } from '@/lib/file-upload'

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
    redirect(`/settings?error=${encodeURIComponent(msg)}`)
  }
  const { email, role } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    redirect('/settings?error=Email+deja+folosit')
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: { email, labelId: session.labelId, acceptedAt: null, expiresAt: { gt: new Date() } },
  })
  if (existingInvite) {
    redirect('/settings?error=Exista+deja+o+invitatie+activa+pentru+acest+email')
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
  redirect(`/settings?invite=${invitation.token}&mail=${mailStatus}`)
}

export async function updateMemberAvatarAction(formData: FormData) {
  const session = await requireSession()
  if (!canManageTeam(session.role)) throw new Error('Acces interzis')

  const userId = formData.get('userId') as string
  const file = formData.get('avatar') as File

  if (!file || file.size === 0) return

  // Verifică că userul aparține labelului (suportă atât owner cât și membri)
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [
        { labelId: session.labelId },
        { ownedLabel: { id: session.labelId! } },
      ],
    },
  })
  if (!user) throw new Error('Utilizator negăsit')

  const filename = await saveAvatarFile(file, userId)

  // Șterge avatarul vechi dacă există
  if (user.avatar) {
    const oldPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', user.avatar)
    await fs.unlink(oldPath).catch(() => {})
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: filename },
  })

  revalidatePath('/team')
}

export async function updateComposerPhotoAction(formData: FormData) {
  const session = await requireSession()
  if (!canManageTeam(session.role)) throw new Error('Acces interzis')

  const composerId = formData.get('composerId') as string
  const file = formData.get('photo') as File
  if (!file || file.size === 0) return

  const composer = await prisma.composer.findFirst({
    where: { id: composerId, labelId: session.labelId! },
  })
  if (!composer) throw new Error('Compozitor negăsit')

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'composers')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${composerId}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadsDir, filename), buffer)

  if (composer.photo) {
    await fs.unlink(path.join(uploadsDir, composer.photo)).catch(() => {})
  }

  await prisma.composer.update({ where: { id: composerId }, data: { photo: filename } })
  revalidatePath('/team')
}

export async function addComposerAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) redirect('/team?error=Numele+compozitorului+este+obligatoriu')

  const email = (formData.get('email') as string | null)?.trim() || null
  const specialization = (formData.get('specialization') as string | null)?.trim() || null

  await prisma.composer.create({
    data: { name, email, specialization, labelId: session.labelId },
  })

  redirect('/team')
}

export async function removeComposerAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const composerId = (formData.get('composerId') as string | null)?.trim()
  if (!composerId) redirect('/team')

  const composer = await prisma.composer.findUnique({ where: { id: composerId } })
  if (!composer || composer.labelId !== session.labelId) redirect('/team')

  await prisma.composer.delete({ where: { id: composerId } })
  redirect('/team')
}

export async function revokeTeamInvitationAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) {
    redirect('/dashboard')
  }

  const invitationId = String(formData.get('invitationId') || '').trim()
  if (!invitationId) redirect('/settings')

  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.labelId !== session.labelId || invitation.acceptedAt) {
    redirect('/settings?error=Invitatia+nu+poate+fi+revocata')
  }

  await prisma.invitation.delete({ where: { id: invitationId } })
  redirect('/settings')
}
