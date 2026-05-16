'use server'

import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageArtists } from '@/lib/roles'
import { createArtistSchema, updateArtistSchema } from '@/lib/schemas'

async function savePhotoFile(file: File, artistId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${artistId}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'artists')
  await fs.mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  return `/uploads/artists/${filename}`
}

export async function createArtistAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) {
    redirect('/dashboard')
  }

  const result = createArtistSchema.safeParse({
    name:         formData.get('name'),
    genre:        formData.get('genre'),
    realName:     formData.get('realName') ?? '',
    spotifyUrl:   formData.get('spotifyUrl') ?? '',
    instagram:    formData.get('instagram') ?? '',
    contactEmail: formData.get('contactEmail') ?? '',
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/artists?error=${encodeURIComponent(msg)}`)
  }
  const { name, genre, realName, spotifyUrl, instagram, contactEmail } = result.data

  await prisma.artist.create({
    data: { name, genre, realName, spotifyUrl, instagram, contactEmail, labelId: session.labelId },
  })

  redirect('/artists')
}

export async function updateArtistAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) {
    redirect('/dashboard')
  }

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/artists')

  const artist = await prisma.artist.findUnique({ where: { id } })
  if (!artist || artist.labelId !== session.labelId) redirect('/artists')

  const result = updateArtistSchema.safeParse({
    name:           formData.get('name') ?? artist.name,
    genre:          formData.get('genre') ?? artist.genre,
    realName:       formData.get('realName') ?? '',
    birthDate:      formData.get('birthDate') ?? '',
    nationality:    formData.get('nationality') ?? '',
    subgenre:       formData.get('subgenre') ?? '',
    bio:            formData.get('bio') ?? '',
    spotifyUrl:     formData.get('spotifyUrl') ?? '',
    appleMusicUrl:  formData.get('appleMusicUrl') ?? '',
    youtubeUrl:     formData.get('youtubeUrl') ?? '',
    instagram:      formData.get('instagram') ?? '',
    tiktok:         formData.get('tiktok') ?? '',
    contactEmail:   formData.get('contactEmail') ?? '',
    contactPhone:   formData.get('contactPhone') ?? '',
    managerName:    formData.get('managerName') ?? '',
    managerContact: formData.get('managerContact') ?? '',
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/artists/${id}?error=${encodeURIComponent(msg)}`)
  }
  const data = result.data

  // Gestionare foto: fișier upload > URL text > valoare existentă
  let photo = artist.photo
  const photoFile = formData.get('photoFile') as File | null
  if (photoFile && photoFile.size > 0) {
    photo = await savePhotoFile(photoFile, id)
  } else {
    const photoUrl = String(formData.get('photoUrl') || '').trim()
    if (photoUrl) photo = photoUrl
  }

  await prisma.artist.update({
    where: { id },
    data: { ...data, photo },
  })

  redirect(`/artists/${id}`)
}

export async function addTrackToArtistAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) {
    redirect('/dashboard')
  }

  const artistId = String(formData.get('artistId') || '').trim()
  const title = String(formData.get('title') || '').trim()
  if (!artistId || !title) redirect('/artists')

  const artist = await prisma.artist.findUnique({ where: { id: artistId } })
  if (!artist || artist.labelId !== session.labelId) redirect('/artists')

  await prisma.track.create({
    data: {
      title,
      artistId,
      labelId: session.labelId,
      genre: String(formData.get('genre') || '').trim() || null,
      type: String(formData.get('type') || 'SINGLE'),
      status: 'UNRELEASED',
    },
  })

  redirect(`/artists/${artistId}`)
}
