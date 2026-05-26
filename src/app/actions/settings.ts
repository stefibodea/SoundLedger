'use server'

import { redirect } from 'next/navigation'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function updateLabelAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const name    = String(formData.get('name')    || '').trim()
  const country = String(formData.get('country') || '').trim()
  const city    = String(formData.get('city')    || '').trim()
  const genre   = String(formData.get('genre')   || '').trim()

  if (!name || !country || !city || !genre) {
    redirect('/settings?tab=label&error=' + encodeURIComponent('Toate câmpurile sunt obligatorii'))
  }

  const logoFile = formData.get('logo') as File | null
  let logoPath: string | undefined

  if (logoFile && logoFile.size > 0) {
    const bytes  = await logoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = logoFile.name.split('.').pop() ?? 'png'
    const filename = `label-${session.labelId}.${ext}`
    const dir = join(process.cwd(), 'public', 'uploads', 'logos')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), buffer)
    logoPath = `/uploads/logos/${filename}`
  }

  await prisma.label.update({
    where: { id: session.labelId },
    data: {
      name,
      country,
      city,
      genre,
      ...(logoPath ? { logo: logoPath } : {}),
    },
  })

  redirect('/settings?tab=label&success=label_actualizat')
}

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Gratuit',
  INDIE:      'Indie',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}

export async function requestUpgradeAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const desiredPlan = String(formData.get('desiredPlan') || '').trim()
  const message     = String(formData.get('message')     || '').trim()

  if (!desiredPlan) {
    redirect('/settings?tab=abonament&error=' + encodeURIComponent('Selectează planul dorit'))
  }

  const [user, label] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true, email: true },
    }),
    prisma.label.findUnique({
      where: { id: session.labelId },
      select: { name: true, plan: true },
    }),
  ])

  const contactEmail = process.env.SALES_EMAIL || 'contact@soundledger.ro'
  const senderName   = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Utilizator'

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1c1b22; color: #f0efe8; padding: 40px; border-radius: 12px;">
  <h1 style="color: #9B94F0; font-size: 24px; margin-bottom: 8px;">SoundLedger</h1>
  <h2 style="font-size: 20px; margin-bottom: 20px;">Cerere upgrade plan</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr><td style="padding: 8px 0; color: #c8c6bc; width: 140px;">Label</td><td style="padding: 8px 0; font-weight: 600;">${label?.name ?? '—'}</td></tr>
    <tr><td style="padding: 8px 0; color: #c8c6bc;">Contact</td><td style="padding: 8px 0;">${senderName} &lt;${user?.email ?? '—'}&gt;</td></tr>
    <tr><td style="padding: 8px 0; color: #c8c6bc;">Plan curent</td><td style="padding: 8px 0;">${PLAN_LABELS[label?.plan ?? ''] ?? label?.plan ?? '—'}</td></tr>
    <tr><td style="padding: 8px 0; color: #c8c6bc;">Plan dorit</td><td style="padding: 8px 0; color: #9B94F0; font-weight: 700;">${PLAN_LABELS[desiredPlan] ?? desiredPlan}</td></tr>
  </table>
  ${message ? `<div style="background: #23212b; border-left: 3px solid #9B94F0; padding: 14px 16px; border-radius: 6px; color: #c8c6bc; font-size: 14px; line-height: 1.6;">${message}</div>` : ''}
</div>`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'SoundLedger <onboarding@resend.dev>',
      to:   contactEmail,
      replyTo: user?.email,
      subject: `Cerere upgrade plan — ${label?.name ?? 'Label'} → ${PLAN_LABELS[desiredPlan] ?? desiredPlan}`,
      html,
    })
  } catch (err) {
    console.error('[upgrade-request] Resend error:', err)
  }

  redirect('/settings?tab=abonament&success=upgrade_solicitat')
}
