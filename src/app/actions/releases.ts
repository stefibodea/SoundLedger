'use server'

import { redirect } from 'next/navigation'
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
  { label: 'Press kit redactat', done: false },
  { label: 'Postări social media programate', done: false },
  { label: 'Playlist pitching trimis', done: false },
]

export async function createReleaseAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageReleases(session.role)) {
    redirect('/dashboard')
  }

  const result = createReleaseSchema.safeParse({
    trackId:     formData.get('trackId'),
    releaseDate: formData.get('releaseDate'),
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/releases?error=${encodeURIComponent(msg)}`)
  }
  const { trackId, releaseDate } = result.data

  await assertTrackBelongsToLabel(trackId, session.labelId, '/releases?error=Piesa+invalida')

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
  redirect('/releases')
}
