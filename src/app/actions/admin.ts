'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'

async function requireSuperAdmin() {
  const session = await requireSession()
  if (session.role !== ROLES.SUPER_ADMIN) {
    redirect('/dashboard')
  }
  return session
}

export async function suspendLabelAction(formData: FormData) {
  await requireSuperAdmin()

  const labelId = String(formData.get('labelId') || '').trim()
  if (!labelId) redirect('/admin')

  try {
    await prisma.label.update({
      where: { id: labelId },
      data: { suspendedAt: new Date() },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Eroare la suspendare'
    redirect(`/admin/${labelId}?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/admin')
  redirect(`/admin/${labelId}?success=1`)
}

export async function unsuspendLabelAction(formData: FormData) {
  await requireSuperAdmin()

  const labelId = String(formData.get('labelId') || '').trim()
  if (!labelId) redirect('/admin')

  try {
    await prisma.label.update({
      where: { id: labelId },
      data: { suspendedAt: null },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Eroare la reactivare'
    redirect(`/admin/${labelId}?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/admin')
  redirect(`/admin/${labelId}?success=1`)
}

export async function deleteLabelAction(formData: FormData) {
  await requireSuperAdmin()

  const labelId = String(formData.get('labelId') || '').trim()
  if (!labelId) redirect('/admin')

  const label = await prisma.label.findUnique({ where: { id: labelId } })
  if (!label) redirect('/admin')

  try {
    await prisma.$transaction([
      prisma.royaltyPayment.deleteMany({ where: { labelId } }),
      prisma.audioFingerprint.deleteMany({ where: { labelId } }),
      prisma.humanMadeCertificate.deleteMany({ where: { labelId } }),
      prisma.aIDetection.deleteMany({ where: { labelId } }),
      prisma.aIPermission.deleteMany({ where: { labelId } }),
      prisma.release.deleteMany({ where: { labelId } }),
      prisma.aRProspect.deleteMany({ where: { labelId } }),
      prisma.revenue.deleteMany({ where: { labelId } }),
      prisma.contract.deleteMany({ where: { labelId } }),
      prisma.track.deleteMany({ where: { labelId } }),
      prisma.album.deleteMany({ where: { labelId } }),
      prisma.invitation.deleteMany({ where: { labelId } }),
      prisma.artist.deleteMany({ where: { labelId } }),
      prisma.user.updateMany({ where: { labelId }, data: { labelId: null } }),
      prisma.label.delete({ where: { id: labelId } }),
    ])
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Eroare la ștergere'
    redirect(`/admin/${labelId}?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/admin')
  redirect('/admin')
}
