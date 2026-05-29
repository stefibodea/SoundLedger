'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageReleases } from '@/lib/roles'
import { assertTrackBelongsToLabel } from '@/lib/tenant-security'
import { createReleaseSchema } from '@/lib/schemas'

const DEFAULT_CHECKLIST = [
  { label: 'Master audio finalizat', done: false },
  { label: 'Cover art aprobat', done: false },
  { label: 'ISRC/UPC atribuit', done: false },
  { label: 'Distribuție setată', done: false },
  { label: 'Postări social media programate', done: false },
  { label: 'Playlist pitching trimis', done: false },
]

export async function createReleaseAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageReleases(session.role)) {
    redirect('/dashboard')
  }

  const returnTo = (formData.get('returnTo') as string | null) || '/releases'

  const result = createReleaseSchema.safeParse({
    trackId:     formData.get('trackId'),
    releaseDate: formData.get('releaseDate'),
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`${returnTo}?error=${encodeURIComponent(msg)}`)
  }
  const { trackId, releaseDate } = result.data

  await assertTrackBelongsToLabel(trackId, session.labelId, `${returnTo}?error=Piesa+invalida`)

  await prisma.release.create({
    data: {
      labelId: session.labelId,
      trackId,
      releaseDate,
      status: 'PLANNING',
      checklist: JSON.stringify(DEFAULT_CHECKLIST),
    },
  })

  redirect('/releases')
}

export async function updateReleaseAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageReleases(session.role)) redirect('/releases')

  const id           = String(formData.get('id') || '').trim()
  const releaseDate  = String(formData.get('releaseDate') || '').trim()
  const status       = String(formData.get('status') || '').trim()
  const checklistRaw = (formData.get('checklist') as string | null)?.trim() || null

  const validStatuses = ['PLANNING', 'READY', 'RELEASED']
  if (!id || !releaseDate || !validStatuses.includes(status)) redirect('/releases')

  const release = await prisma.release.findUnique({ where: { id } })
  if (!release || release.labelId !== session.labelId) redirect('/releases')

  const updated = await prisma.release.update({
    where: { id },
    data: {
      releaseDate,
      status,
      checklist: checklistRaw || null,
    },
  })

  // Sincronizează statusul piesei când lansarea devine RELEASED
  if (status === 'RELEASED' && updated.trackId) {
    await prisma.track.update({
      where: { id: updated.trackId },
      data: { status: 'RELEASED' },
    })
  }

  revalidatePath('/releases')
  redirect('/releases')
}

export async function updateReleaseStatusAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageReleases(session.role)) {
    redirect('/dashboard')
  }

  const releaseId = String(formData.get('releaseId') || '').trim()
  const status = String(formData.get('status') || '').trim()
  const validStatuses = ['PLANNING', 'READY', 'RELEASED']
  if (!releaseId || !validStatuses.includes(status)) {
    redirect('/releases')
  }

  const release = await prisma.release.findUnique({ where: { id: releaseId } })
  if (!release || release.labelId !== session.labelId) {
    redirect('/releases')
  }

  await prisma.release.update({ where: { id: releaseId }, data: { status } })

  // Sincronizează statusul piesei când lansarea devine RELEASED
  if (status === 'RELEASED' && release.trackId) {
    await prisma.track.update({
      where: { id: release.trackId },
      data: { status: 'RELEASED' },
    })
  }

  redirect('/releases')
}
