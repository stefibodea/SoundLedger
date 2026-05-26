'use server'

import { requireSession } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { saveAvatarFile } from '@/lib/file-upload'
import { promises as fs } from 'fs'
import path from 'path'

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession()

  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const avatarFile = formData.get('avatar') as File | null

  if (!firstName || !lastName) {
    redirect('/settings?tab=profil&error=campuri_obligatorii')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    redirect('/settings?tab=profil&error=email_invalid')
  }

  let avatarFilename: string | undefined

  if (avatarFile && avatarFile.size > 0) {
    const existing = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatar: true },
    })

    if (existing?.avatar) {
      const oldPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', existing.avatar)
      try {
        await fs.unlink(oldPath)
      } catch {
        // fișierul poate să nu existe
      }
    }

    try {
      avatarFilename = await saveAvatarFile(avatarFile, session.userId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare upload avatar'
      redirect('/settings?tab=profil&error=' + encodeURIComponent(msg))
    }
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName,
      lastName,
      email,
      ...(avatarFilename ? { avatar: avatarFilename } : {}),
    },
  })

  revalidatePath('/settings')
  redirect('/settings?tab=profil&success=profil_actualizat')
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSession()

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) {
    redirect('/settings?tab=profil&error=parolele_nu_coincid')
  }

  if (newPassword.length < 8) {
    redirect('/settings?tab=profil&error=parola_prea_scurta')
  }

  if (!/[A-Z]/.test(newPassword)) {
    redirect('/settings?tab=profil&error=parola_fara_litera_mare')
  }

  if (!/[0-9]/.test(newPassword)) {
    redirect('/settings?tab=profil&error=parola_fara_cifra')
  }

  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    redirect('/settings?tab=profil&error=parola_fara_special')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { password: true },
  })

  if (!user) {
    redirect('/settings?tab=profil&error=utilizator_negasit')
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    redirect('/settings?tab=profil&error=parola_incorecta')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.userId },
    data: { password: hashedPassword },
  })

  redirect('/settings?tab=profil&success=parola_actualizata')
}
