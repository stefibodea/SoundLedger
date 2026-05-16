'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''

  if (!email || !email.includes('@') || !email.includes('.')) {
    redirect('/forgot-password?error=Adresă+de+email+invalidă')
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { email } })

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.create({ data: { token, email, expiresAt } })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${token}`

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1c1b22; color: #f0efe8; padding: 40px; border-radius: 12px;">
  <h1 style="color: #9B94F0; font-size: 24px; margin-bottom: 8px;">SoundLedger</h1>
  <h2 style="font-size: 20px; margin-bottom: 16px;">Resetare parolă</h2>
  <p style="color: #c8c6bc; line-height: 1.6;">Ai solicitat resetarea parolei pentru contul tău SoundLedger. Apasă butonul de mai jos pentru a seta o parolă nouă.</p>
  <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #9B94F0; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Resetează parola</a>
  <p style="color: #c8c6bc; font-size: 13px;">Link-ul expiră în <strong>1 oră</strong>. Dacă nu ai solicitat resetarea parolei, ignoră acest email.</p>
  <p style="color: #c8c6bc; font-size: 13px; margin-top: 8px;">Sau copiază acest link în browser:<br/><span style="color: #9B94F0;">${resetLink}</span></p>
</div>`

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'SoundLedger <onboarding@resend.dev>',
        to: email,
        subject: 'Resetare parolă SoundLedger',
        html,
      })
    } catch (err) {
      console.error('[password-reset] Resend error:', err)
    }
  }

  redirect('/forgot-password?sent=1')
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const token = (formData.get('token') as string | null)?.trim() ?? ''
  const newPassword = (formData.get('newPassword') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (newPassword.length < 8) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent('Parola trebuie să aibă minim 8 caractere')}`)
  }

  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent('Parolele nu coincid')}`)
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    redirect('/reset-password?error=' + encodeURIComponent('Token invalid sau expirat'))
  }

  if (record.usedAt) {
    redirect('/reset-password?error=' + encodeURIComponent('Acest link a fost deja folosit'))
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } })
    redirect('/reset-password?error=' + encodeURIComponent('Link-ul a expirat. Solicită unul nou.'))
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { email: record.email },
    data: { password: hashedPassword, mustResetPassword: false },
  })

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  redirect('/login?success=' + encodeURIComponent('Parola a fost resetată cu succes. Te poți autentifica acum.'))
}
