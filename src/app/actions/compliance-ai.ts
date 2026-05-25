'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance, canManageOptOut } from '@/lib/roles'

// ── Opt-Out Declaration ───────────────────────────────────────────────────────

function generateOptOutCode(): string {
  const year = new Date().getFullYear()
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `OPT-${year}-${rand}`
}

export async function issueOptOutDeclarationAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageOptOut(session.role)) redirect('/dashboard')

  const notes = String(formData.get('notes') || '').trim() || null

  const existing = await prisma.aIOptOutDeclaration.findUnique({
    where: { labelId: session.labelId },
  })

  if (existing && !existing.isRevoked) {
    redirect('/settings/opt-out?error=' + encodeURIComponent('Există deja o declarație activă'))
  }

  const declarationCode = generateOptOutCode()

  if (existing) {
    await prisma.aIOptOutDeclaration.update({
      where: { labelId: session.labelId },
      data: {
        declarationCode,
        issuedAt: new Date(),
        issuedById: session.userId,
        isRevoked: false,
        revokedAt: null,
        revokedReason: null,
        notes,
      },
    })
  } else {
    await prisma.aIOptOutDeclaration.create({
      data: {
        labelId: session.labelId,
        declarationCode,
        issuedById: session.userId,
        notes,
      },
    })
  }

  redirect('/settings/opt-out?success=1')
}

export async function revokeOptOutDeclarationAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageOptOut(session.role)) redirect('/dashboard')

  const reason = String(formData.get('reason') || '').trim() || null

  await prisma.aIOptOutDeclaration.update({
    where: { labelId: session.labelId },
    data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  })

  redirect('/settings/opt-out?revoked=1')
}

// ── Creative Record ───────────────────────────────────────────────────────────

export async function upsertCreativeRecordAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/dashboard')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/compliance/creative')

  const track = await prisma.track.findUnique({ where: { id: trackId } })
  if (!track || track.labelId !== session.labelId) redirect('/compliance/creative')

  const aiCompozitie = formData.get('aiCompozitie') === 'true'
  const aiVersuri    = formData.get('aiVersuri')    === 'true'
  const aiVoce       = formData.get('aiVoce')       === 'true'
  const aiProductie  = formData.get('aiProductie')  === 'true'
  const aiAltele     = String(formData.get('aiAltele')     || '').trim() || null
  const composers    = String(formData.get('composers')    || '').trim() || null
  const producers    = String(formData.get('producers')    || '').trim() || null
  const daw          = String(formData.get('daw')          || '').trim() || null
  const sessionDate  = String(formData.get('sessionDate')  || '').trim() || null
  const studio       = String(formData.get('studio')       || '').trim() || null
  const instruments  = String(formData.get('instruments')  || '').trim() || null
  const statement    = String(formData.get('statement')    || '').trim() || null
  const issueCert    = formData.get('issueCert') === 'true'

  const hasAI = aiCompozitie || aiVersuri || aiVoce || aiProductie || !!aiAltele

  await prisma.creativeRecord.upsert({
    where: { trackId },
    create: {
      trackId,
      labelId: session.labelId,
      aiCompozitie,
      aiVersuri,
      aiVoce,
      aiProductie,
      aiAltele,
      composers,
      producers,
      daw,
      sessionDate,
      studio,
      instruments,
      statement,
    },
    update: {
      aiCompozitie,
      aiVersuri,
      aiVoce,
      aiProductie,
      aiAltele,
      composers,
      producers,
      daw,
      sessionDate,
      studio,
      instruments,
      statement,
    },
  })

  // Auto-issue certificate only when no AI was used
  if (!hasAI && issueCert) {
    const existing = await prisma.humanMadeCertificate.findUnique({ where: { trackId } })
    if (!existing || existing.isRevoked) {
      const year   = new Date().getFullYear()
      const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
      const certDeclaration = statement ||
        'Certific prin prezenta că această piesă muzicală este 100% creație umană, fără implicarea sistemelor de inteligență artificială generativă.'
      await prisma.humanMadeCertificate.upsert({
        where: { trackId },
        create: {
          trackId,
          labelId: session.labelId,
          certificateCode: `HM-${year}-${suffix}`,
          issuedAt: new Date(),
          issuedById: session.userId,
          declaration: certDeclaration,
          isRevoked: false,
        },
        update: {
          certificateCode: `HM-${year}-${suffix}`,
          issuedAt: new Date(),
          issuedById: session.userId,
          declaration: certDeclaration,
          isRevoked: false,
          revokedAt: null,
          revokedReason: null,
        },
      })
    }
  }

  revalidatePath('/compliance/creative')
  revalidatePath('/compliance')
  redirect(`/compliance/creative?success=1&track=${encodeURIComponent(track.title)}&cert=${!hasAI && issueCert ? '1' : '0'}`)
}

export async function issueCertFromCreativeAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/creative')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/compliance/creative')

  const track = await prisma.track.findFirst({
    where: { id: trackId, labelId: session.labelId },
    include: { creativeRecord: true },
  })
  if (!track) redirect('/compliance/creative')

  const existing = await prisma.humanMadeCertificate.findUnique({ where: { trackId } })
  if (existing && !existing.isRevoked) {
    redirect(`/compliance/creative?error=${encodeURIComponent('Piesa are deja un certificat activ')}`)
  }

  const year   = new Date().getFullYear()
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const certDeclaration = track.creativeRecord?.statement ||
    'Certific prin prezenta că această piesă muzicală este 100% creație umană, fără implicarea sistemelor de inteligență artificială generativă.'

  await prisma.humanMadeCertificate.upsert({
    where: { trackId },
    create: {
      trackId,
      labelId: session.labelId,
      certificateCode: `HM-${year}-${suffix}`,
      issuedAt: new Date(),
      issuedById: session.userId,
      declaration: certDeclaration,
      isRevoked: false,
    },
    update: {
      certificateCode: `HM-${year}-${suffix}`,
      issuedAt: new Date(),
      issuedById: session.userId,
      declaration: certDeclaration,
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
  })

  revalidatePath('/compliance/creative')
  revalidatePath('/compliance')
  redirect(`/compliance/creative?success=1&track=${encodeURIComponent(track.title)}&cert=1`)
}

export async function deleteCreativeRecordAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/dashboard')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/compliance/creative')

  const record = await prisma.creativeRecord.findUnique({ where: { trackId } })
  if (!record || record.labelId !== session.labelId) redirect('/compliance/creative')

  await prisma.creativeRecord.delete({ where: { trackId } })

  revalidatePath('/compliance/creative')
  redirect('/compliance/creative')
}
