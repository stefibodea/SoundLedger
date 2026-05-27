'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canUseScouting, canManageContracts } from '@/lib/roles'
import { createProspectSchema, updateProspectSchema } from '@/lib/schemas'

// Tranziții permise: doar înainte, REJECTED doar din NEGOTIATION
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ANALYZING:   ['CONTACTED'],
  CONTACTED:   ['NEGOTIATION'],
  NEGOTIATION: ['SIGNED', 'REJECTED'],
  SIGNED:      [],
  REJECTED:    [],
}

export async function moveProspectAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  const status = String(formData.get('status') || '').trim()
  const returnUrl = String(formData.get('returnUrl') || '').trim() || '/ar'

  if (!id || !Object.keys(ALLOWED_TRANSITIONS).includes(status)) redirect('/ar')

  const prospect = await prisma.aRProspect.findUnique({ where: { id } })
  if (!prospect || prospect.labelId !== session.labelId) redirect('/ar')

  const allowed = ALLOWED_TRANSITIONS[prospect.status] ?? []
  if (!allowed.includes(status)) redirect(returnUrl)

  await prisma.aRProspect.update({ where: { id }, data: { status } })
  redirect(returnUrl)
}

export async function createProspectAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const sourceOption = String(formData.get('sourceOption') || '').trim()
  const sourceCustom = String(formData.get('sourceCustom') || '').trim()
  const source = sourceOption === 'Altele' ? (sourceCustom || 'Altele') : sourceOption

  const result = createProspectSchema.safeParse({
    name:          formData.get('name'),
    source,
    spotifyUrl:    formData.get('spotifyUrl') ?? '',
    youtubeUrl:    formData.get('youtubeUrl') ?? '',
    soundcloudUrl: formData.get('soundcloudUrl') ?? '',
    instagram:     formData.get('instagram') ?? '',
    tiktok:        formData.get('tiktok') ?? '',
    notes:         formData.get('notes') ?? '',
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/ar?error=${encodeURIComponent(msg)}`)
  }
  const { name, source: src, spotifyUrl, youtubeUrl, soundcloudUrl, instagram, tiktok, notes } = result.data

  await prisma.aRProspect.create({
    data: { name, source: src, spotifyUrl, youtubeUrl, soundcloudUrl, instagram, tiktok, notes, status: 'ANALYZING', labelId: session.labelId },
  })

  redirect('/ar')
}

export async function updateProspectAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/ar')

  const prospect = await prisma.aRProspect.findUnique({ where: { id } })
  if (!prospect || prospect.labelId !== session.labelId) redirect('/ar')

  const sourceOption = String(formData.get('sourceOption') || '').trim()
  const sourceCustom = String(formData.get('sourceCustom') || '').trim()
  const source = sourceOption === 'Altele' ? (sourceCustom || 'Altele') : sourceOption || null

  const updateResult = updateProspectSchema.safeParse({
    name:          formData.get('name'),
    source:        source ?? '',
    spotifyUrl:    formData.get('spotifyUrl') ?? '',
    youtubeUrl:    formData.get('youtubeUrl') ?? '',
    soundcloudUrl: formData.get('soundcloudUrl') ?? '',
    instagram:     formData.get('instagram') ?? '',
    tiktok:        formData.get('tiktok') ?? '',
    notes:         formData.get('notes') ?? '',
  })
  if (!updateResult.success) {
    const msg = updateResult.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/ar/${id}?error=${encodeURIComponent(msg)}`)
  }
  const { name, source: src, spotifyUrl, youtubeUrl, soundcloudUrl, instagram, tiktok, notes } = updateResult.data

  await prisma.aRProspect.update({
    where: { id },
    data: { name, source: src, spotifyUrl, youtubeUrl, soundcloudUrl, instagram, tiktok, notes },
  })

  redirect(`/ar/${id}?saved=1`)
}

export async function signAndOnboardArtistAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageContracts(session.role)) redirect('/dashboard')

  const prospectId      = String(formData.get('prospectId') || '').trim()
  const genre           = String(formData.get('genre') || '').trim()
  const duration        = String(formData.get('duration') || '').trim()
  const royaltyPercent  = Number(formData.get('royaltyPercent'))
  const startDate       = String(formData.get('startDate') || '').trim() || null
  const endDate         = String(formData.get('endDate') || '').trim() || null

  if (!prospectId || !genre || !duration || isNaN(royaltyPercent) || royaltyPercent < 0 || royaltyPercent > 100) {
    redirect(`/ar/${prospectId}?error=${encodeURIComponent('Completează toate câmpurile obligatorii')}`)
  }

  const prospect = await prisma.aRProspect.findUnique({ where: { id: prospectId } })
  if (!prospect || prospect.labelId !== session.labelId) redirect('/ar')

  const artist = await prisma.artist.create({
    data: {
      name:       prospect.name,
      genre,
      spotifyUrl: prospect.spotifyUrl,
      youtubeUrl: prospect.youtubeUrl,
      instagram:  prospect.instagram,
      tiktok:     prospect.tiktok,
      labelId:    session.labelId,
    },
  })

  await prisma.contract.create({
    data: {
      artistId:      artist.id,
      labelId:       session.labelId,
      duration,
      royaltyPercent,
      advance:       0,
      startDate,
      endDate,
      status:        'ACTIVE',
      territories:   '[]',
      rights:        '[]',
    },
  })

  await prisma.aRProspect.update({ where: { id: prospectId }, data: { status: 'SIGNED' } })

  redirect(`/artists/${artist.id}`)
}

export async function deleteProspectAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/ar')

  const prospect = await prisma.aRProspect.findUnique({ where: { id } })
  if (!prospect || prospect.labelId !== session.labelId) redirect('/ar')

  await prisma.aRProspect.delete({ where: { id } })
  redirect('/ar')
}
