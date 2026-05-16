'use server'

import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageArtists } from '@/lib/roles'
import { assertArtistBelongsToLabel } from '@/lib/tenant-security'
import { createTrackSchema, createAlbumSchema } from '@/lib/schemas'
import { saveAudioFile, deleteAudioFile } from '@/lib/file-upload'

async function saveCoverFile(file: File, trackId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${trackId}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'covers')
  await fs.mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  return `/uploads/covers/${filename}`
}

export async function createTrackAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) {
    redirect('/dashboard')
  }

  const result = createTrackSchema.safeParse({
    title:    formData.get('title'),
    artistId: formData.get('artistId'),
    genre:    formData.get('genre') ?? '',
    isrc:     formData.get('isrc') ?? '',
    bpm:      '',
    key:      formData.get('key') ?? '',
    type:     formData.get('type'),
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/catalog?error=${encodeURIComponent(msg)}`)
  }
  const { title, artistId, genre, isrc, key, type } = result.data

  await assertArtistBelongsToLabel(artistId, session.labelId, '/catalog?error=Artist+invalid')

  const track = await prisma.track.create({
    data: { title, artistId, labelId: session.labelId, genre, isrc, bpm: null, key, type, status: 'UNRELEASED' },
  })

  const audioFile = formData.get('audioFile') as File | null
  if (audioFile && audioFile.size > 0) {
    try {
      const filename = await saveAudioFile(audioFile, track.id)
      await prisma.track.update({ where: { id: track.id }, data: { audioFile: filename } })

      const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL || 'http://localhost:8000'
      const absolutePath = path.join(process.cwd(), 'public', 'uploads', 'catalog', filename)
      const fileBuffer = await fs.readFile(absolutePath)
      const fd = new FormData()
      fd.append('file', new Blob([fileBuffer]), filename)

      const res = await fetch(`${AUDIO_SERVICE_URL}/extract`, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(60000),
      })

      if (res.ok) {
        const fp = await res.json() as {
          mfccMean: number[]; chromaMean: number[]
          mfccMatrix: number[][]; chromaMatrix: number[][]
          tempo: number; duration: number; sampleRate: number; hopLength: number
        }
        const bpm = Math.round(fp.tempo)
        await prisma.track.update({ where: { id: track.id }, data: { bpm } })
        await prisma.audioFingerprint.upsert({
          where: { trackId: track.id },
          create: {
            trackId:     track.id,
            labelId:     session.labelId!,
            mfccMean:    JSON.stringify(fp.mfccMean),
            chromaMean:  JSON.stringify(fp.chromaMean),
            mfccMatrix:  JSON.stringify(fp.mfccMatrix),
            chromaMatrix: JSON.stringify(fp.chromaMatrix),
            tempo:       fp.tempo,
            duration:    fp.duration,
            sampleRate:  fp.sampleRate,
            hopLength:   fp.hopLength,
          },
          update: {
            mfccMean:    JSON.stringify(fp.mfccMean),
            chromaMean:  JSON.stringify(fp.chromaMean),
            mfccMatrix:  JSON.stringify(fp.mfccMatrix),
            chromaMatrix: JSON.stringify(fp.chromaMatrix),
            tempo:       fp.tempo,
            duration:    fp.duration,
            computedAt:  new Date(),
          },
        })
      } else {
        console.error(`[createTrack] Serviciul audio a returnat ${res.status}`)
      }
    } catch (err) {
      console.error('[createTrack] Eroare procesare audio:', err)
    }
  }

  redirect('/catalog')
}

export async function updateTrackAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/catalog')

  const track = await prisma.track.findUnique({ where: { id } })
  if (!track || track.labelId !== session.labelId) redirect('/catalog')

  // Cover art: fișier > URL > existent
  let coverArt = track.coverArt
  const coverFile = formData.get('coverFile') as File | null
  if (coverFile && coverFile.size > 0) {
    coverArt = await saveCoverFile(coverFile, id)
  } else {
    const coverUrl = String(formData.get('coverUrl') || '').trim()
    if (coverUrl) coverArt = coverUrl
  }

  // Audio file: dacă s-a încărcat fișier nou, înlocuiește cel existent
  let audioFilename = track.audioFile
  const newAudioFile = formData.get('audioFile') as File | null
  if (newAudioFile && newAudioFile.size > 0) {
    try {
      if (track.audioFile) await deleteAudioFile(track.audioFile)
      audioFilename = await saveAudioFile(newAudioFile, id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare la upload audio'
      redirect(`/catalog/${id}/edit?error=${encodeURIComponent(msg)}`)
    }
  }

  const bpmRaw = formData.get('bpm')
  const bpm = bpmRaw ? parseInt(String(bpmRaw), 10) || null : null
  const durationRaw = formData.get('duration')
  const duration = durationRaw ? parseInt(String(durationRaw), 10) || null : null

  await prisma.track.update({
    where: { id },
    data: {
      title: String(formData.get('title') || '').trim() || track.title,
      type: String(formData.get('type') || track.type),
      genre: String(formData.get('genre') || '').trim() || null,
      subgenre: String(formData.get('subgenre') || '').trim() || null,
      isrc: String(formData.get('isrc') || '').trim() || null,
      bpm,
      key: String(formData.get('key') || '').trim() || null,
      duration,
      releaseDate: String(formData.get('releaseDate') || '').trim() || null,
      composers: String(formData.get('composers') || '').trim() || null,
      producers: String(formData.get('producers') || '').trim() || null,
      lyrics: String(formData.get('lyrics') || '').trim() || null,
      coverArt,
      audioFile: audioFilename,
    },
  })

  redirect(`/catalog/${id}`)
}

export async function toggleTrackStatusAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  const returnTo = String(formData.get('returnTo') || '/catalog')
  if (!id) redirect(returnTo)

  const track = await prisma.track.findUnique({ where: { id } })
  if (!track || track.labelId !== session.labelId) redirect(returnTo)

  await prisma.track.update({
    where: { id },
    data: {
      status: track.status === 'RELEASED' ? 'UNRELEASED' : 'RELEASED',
      releaseDate: track.status === 'UNRELEASED' ? new Date().toISOString().split('T')[0] : track.releaseDate,
    },
  })

  redirect(returnTo)
}

export async function removeTrackAudioAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/catalog')

  const track = await prisma.track.findUnique({ where: { id: trackId } })
  if (!track || track.labelId !== session.labelId) redirect('/catalog')

  if (track.audioFile) {
    await deleteAudioFile(track.audioFile)
  }

  await prisma.audioFingerprint.deleteMany({ where: { trackId } })

  await prisma.track.update({
    where: { id: trackId },
    data: { audioFile: null },
  })

  redirect(`/catalog/${trackId}?success=audio_removed`)
}

export async function createAlbumAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const albumResult = createAlbumSchema.safeParse({
    title:       formData.get('title'),
    artistId:    formData.get('artistId'),
    type:        formData.get('type'),
    releaseDate: formData.get('releaseDate') ?? '',
  })
  if (!albumResult.success) {
    const msg = albumResult.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/catalog/albums?error=${encodeURIComponent(msg)}`)
  }
  const { title, artistId, type, releaseDate } = albumResult.data

  await assertArtistBelongsToLabel(artistId, session.labelId, '/catalog/albums?error=Artist+invalid')

  await prisma.album.create({
    data: { title, artistId, labelId: session.labelId, type, releaseDate },
  })

  redirect('/catalog/albums')
}
