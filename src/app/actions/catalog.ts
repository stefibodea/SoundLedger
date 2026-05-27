'use server'

import { redirect } from 'next/navigation'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageArtists, canManageCompliance } from '@/lib/roles'
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

  // ── Declarație creativă ──────────────────────────────────────────────────
  const aiCompozitie = formData.get('aiCompozitie') === 'on'
  const aiVersuri    = formData.get('aiVersuri')    === 'on'
  const aiVoce       = formData.get('aiVoce')       === 'on'
  const aiProductie  = formData.get('aiProductie')  === 'on'
  const hasAI        = aiCompozitie || aiVersuri || aiVoce || aiProductie

  const rolesCompozitie = String(formData.get('rolesCompozitie') || '').trim() || null
  const rolesVersuri    = String(formData.get('rolesVersuri')    || '').trim() || null
  const rolesProductie  = String(formData.get('rolesProductie')  || '').trim() || null
  const rolesMixaj      = String(formData.get('rolesMixaj')      || '').trim() || null

  // ── Construiește textul de credite (comun pentru ambele tipuri de declarație)
  const roleParts: string[] = []
  if (rolesCompozitie) roleParts.push(`Compoziție: ${rolesCompozitie}`)
  if (rolesVersuri)    roleParts.push(`Versuri: ${rolesVersuri}`)
  if (rolesProductie)  roleParts.push(`Producție: ${rolesProductie}`)
  if (rolesMixaj)      roleParts.push(`Mixaj: ${rolesMixaj}`)
  const creditsLine = roleParts.length > 0 ? ` Credite: ${roleParts.join('; ')}.` : ''

  const year = new Date().getFullYear()
  const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  if (!hasAI) {
    // ── Certificat Human Made ──────────────────────────────────────────────
    const declaration =
      `Prin prezenta se atestă că piesa "${track.title}" a fost creată integral prin mijloace umane, fără utilizarea inteligenței artificiale în niciuna dintre etapele de producție.${creditsLine}`
    const code = `HM-${year}-${rand()}`

    await prisma.humanMadeCertificate.create({
      data: {
        trackId:         track.id,
        labelId:         session.labelId!,
        certificateCode: code,
        issuedById:      session.userId,
        declaration,
        isRevoked:       false,
      },
    })

    await prisma.creativeRecord.upsert({
      where:  { trackId: track.id },
      create: { trackId: track.id, labelId: session.labelId!, aiCompozitie, aiVersuri, aiVoce, aiProductie, rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj },
      update: { aiCompozitie, aiVersuri, aiVoce, aiProductie, rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj },
    })
  } else {
    // ── Declarație AI ──────────────────────────────────────────────────────
    const aiParts: string[] = []
    if (aiCompozitie) aiParts.push('compoziție / melodie')
    if (aiVersuri)    aiParts.push('versuri / text')
    if (aiVoce)       aiParts.push('voce sintetizată sau clonată')
    if (aiProductie)  aiParts.push('producție / beat')
    const aiList = aiParts.join(', ')

    const declaration =
      `Prin prezenta se declară că piesa "${track.title}" a utilizat inteligența artificială în următoarele etape de producție: ${aiList}.${creditsLine} Această declarație este emisă în conformitate cu prevederile EU AI Act și ale Directivei UE privind drepturile de autor.`
    const code = `AI-${year}-${rand()}`

    await prisma.creativeRecord.upsert({
      where:  { trackId: track.id },
      create: {
        trackId: track.id, labelId: session.labelId!,
        aiCompozitie, aiVersuri, aiVoce, aiProductie,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration, declarationCode: code,
        declaredAt: new Date(), declaredById: session.userId,
      },
      update: {
        aiCompozitie, aiVersuri, aiVoce, aiProductie,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration, declarationCode: code,
        declaredAt: new Date(), declaredById: session.userId,
      },
    })
  }

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

  const rolesCompozitie = String(formData.get('rolesCompozitie') || '').trim() || null
  const rolesVersuri    = String(formData.get('rolesVersuri')    || '').trim() || null
  const rolesProductie  = String(formData.get('rolesProductie')  || '').trim() || null
  const rolesMixaj      = String(formData.get('rolesMixaj')      || '').trim() || null

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
      composers: rolesCompozitie,
      producers: rolesProductie,
      lyrics: String(formData.get('lyrics') || '').trim() || null,
      coverArt,
      audioFile: audioFilename,
    },
  })

  if (rolesCompozitie || rolesVersuri || rolesProductie || rolesMixaj) {
    await prisma.creativeRecord.upsert({
      where: { trackId: id },
      create: {
        trackId: id,
        labelId: session.labelId!,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        composers: rolesCompozitie, producers: rolesProductie,
      },
      update: {
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        composers: rolesCompozitie, producers: rolesProductie,
      },
    })
  }

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

  const newStatus = track.status === 'RELEASED' ? 'UNRELEASED' : 'RELEASED'

  await prisma.track.update({
    where: { id },
    data: {
      status: newStatus,
      releaseDate: track.status === 'UNRELEASED' ? new Date().toISOString().split('T')[0] : track.releaseDate,
    },
  })

  // Sincronizează Release-ul asociat piesei
  const release = await prisma.release.findFirst({
    where: { trackId: id, labelId: session.labelId },
  })
  if (release) {
    await prisma.release.update({
      where: { id: release.id },
      data: { status: newStatus === 'RELEASED' ? 'RELEASED' : 'PLANNING' },
    })
  }

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

export async function declareCreativeRecordAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/dashboard')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/catalog')

  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { humanMadeCert: true, creativeRecord: true },
  })
  if (!track || track.labelId !== session.labelId) redirect('/catalog')

  const aiCompozitie = formData.get('aiCompozitie') === 'on'
  const aiVersuri    = formData.get('aiVersuri')    === 'on'
  const aiVoce       = formData.get('aiVoce')       === 'on'
  const aiProductie  = formData.get('aiProductie')  === 'on'
  const aiAltele     = String(formData.get('aiAltele') || '').trim() || null

  const rolesCompozitie = String(formData.get('rolesCompozitie') || '').trim() || null
  const rolesVersuri    = String(formData.get('rolesVersuri')    || '').trim() || null
  const rolesProductie  = String(formData.get('rolesProductie')  || '').trim() || null
  const rolesMixaj      = String(formData.get('rolesMixaj')      || '').trim() || null

  const hasAI = aiCompozitie || aiVersuri || aiVoce || aiProductie || !!aiAltele

  // ── Construiește textul de credite (comun)
  const roleParts: string[] = []
  if (rolesCompozitie) roleParts.push(`Compoziție: ${rolesCompozitie}`)
  if (rolesVersuri)    roleParts.push(`Versuri: ${rolesVersuri}`)
  if (rolesProductie)  roleParts.push(`Producție: ${rolesProductie}`)
  if (rolesMixaj)      roleParts.push(`Mixaj: ${rolesMixaj}`)
  const creditsLine = roleParts.length > 0 ? ` Credite: ${roleParts.join('; ')}.` : ''
  const year = new Date().getFullYear()
  const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  if (!hasAI) {
    // ── Certificat Human Made ──────────────────────────────────────────────
    const declaration =
      `Prin prezenta se atestă că piesa "${track.title}" a fost creată integral prin mijloace umane, fără utilizarea inteligenței artificiale în niciuna dintre etapele de producție.${creditsLine}`

    const code = track.humanMadeCert?.certificateCode ?? `HM-${year}-${rand()}`

    await prisma.humanMadeCertificate.upsert({
      where: { trackId },
      create: {
        trackId,
        labelId:         session.labelId,
        certificateCode: code,
        issuedById:      session.userId,
        declaration,
        isRevoked:       false,
      },
      update: {
        declaration,
        isRevoked:    false,
        revokedAt:    null,
        revokedReason: null,
        issuedAt:     new Date(),
        issuedById:   session.userId,
      },
    })

    await prisma.creativeRecord.upsert({
      where:  { trackId },
      create: {
        trackId, labelId: session.labelId,
        aiCompozitie, aiVersuri, aiVoce, aiProductie, aiAltele,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration: null, declarationCode: null, declaredAt: null, declaredById: null,
      },
      update: {
        aiCompozitie, aiVersuri, aiVoce, aiProductie, aiAltele,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration: null, declarationCode: null, declaredAt: null, declaredById: null,
      },
    })
  } else {
    // ── Declarație AI ──────────────────────────────────────────────────────
    const aiParts: string[] = []
    if (aiCompozitie) aiParts.push('compoziție / melodie')
    if (aiVersuri)    aiParts.push('versuri / text')
    if (aiVoce)       aiParts.push('voce sintetizată sau clonată')
    if (aiProductie)  aiParts.push('producție / beat')
    if (aiAltele)     aiParts.push(aiAltele)
    const aiList = aiParts.join(', ')

    const declaration =
      `Prin prezenta se declară că piesa "${track.title}" a utilizat inteligența artificială în următoarele etape de producție: ${aiList}.${creditsLine} Această declarație este emisă în conformitate cu prevederile EU AI Act și ale Directivei UE privind drepturile de autor.`

    // Păstrează codul existent dacă există, altfel generează unul nou
    const code = track.creativeRecord?.declarationCode ?? `AI-${year}-${rand()}`

    await prisma.creativeRecord.upsert({
      where:  { trackId },
      create: {
        trackId, labelId: session.labelId,
        aiCompozitie, aiVersuri, aiVoce, aiProductie, aiAltele,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration, declarationCode: code, declaredAt: new Date(), declaredById: session.userId,
      },
      update: {
        aiCompozitie, aiVersuri, aiVoce, aiProductie, aiAltele,
        rolesCompozitie, rolesVersuri, rolesProductie, rolesMixaj,
        declaration, declarationCode: code, declaredAt: new Date(), declaredById: session.userId,
      },
    })

    // Revocă certificatul Human Made dacă există
    if (track.humanMadeCert && !track.humanMadeCert.isRevoked) {
      await prisma.humanMadeCertificate.update({
        where: { trackId },
        data:  { isRevoked: true, revokedAt: new Date(), revokedReason: 'Declarație actualizată: utilizare AI confirmată.' },
      })
    }
  }

  redirect(`/catalog/${trackId}?declared=1`)
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
