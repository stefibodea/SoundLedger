'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance } from '@/lib/roles'
import { resolveAudioFilePath, extractFingerprint } from '@/lib/audio-service'

// ── Helper privat — upsert fingerprint fără autorizare (pentru bulk) ──────────

type TrackForFP = {
  id: string
  title: string
  audioFile: string | null
  artist: { name: string }
}

async function _upsertFingerprint(
  track: TrackForFP,
  labelId: string,
): Promise<{ success: true; computedAt: string } | { success: false; error: string }> {
  if (!track.audioFile) {
    return { success: false, error: 'Piesa nu are fișier audio asociat' }
  }
  try {
    const absolutePath = resolveAudioFilePath(track.audioFile)
    const fp = await extractFingerprint(absolutePath)
    const now = new Date()

    await prisma.audioFingerprint.upsert({
      where: { trackId: track.id },
      create: {
        trackId:      track.id,
        labelId,
        mfccMean:     JSON.stringify(fp.mfccMean),
        chromaMean:   JSON.stringify(fp.chromaMean),
        mfccMatrix:   JSON.stringify(fp.mfccMatrix),
        chromaMatrix: JSON.stringify(fp.chromaMatrix),
        tempo:        fp.tempo,
        duration:     fp.duration,
        sampleRate:   fp.sampleRate,
        hopLength:    fp.hopLength,
        computedAt:   now,
      },
      update: {
        mfccMean:     JSON.stringify(fp.mfccMean),
        chromaMean:   JSON.stringify(fp.chromaMean),
        mfccMatrix:   JSON.stringify(fp.mfccMatrix),
        chromaMatrix: JSON.stringify(fp.chromaMatrix),
        tempo:        fp.tempo,
        duration:     fp.duration,
        sampleRate:   fp.sampleRate,
        hopLength:    fp.hopLength,
        computedAt:   now,
      },
    })

    return { success: true, computedAt: now.toISOString() }
  } catch (err) {
    console.error(`[fingerprints] Eroare track ${track.id} (${track.title}):`, err)
    return { success: false, error: err instanceof Error ? err.message : 'Eroare necunoscută' }
  }
}

// ── Calculează fingerprint pentru o piesă (returnează rezultat inline) ────────

export async function computeFingerprintForTrack(
  trackId: string,
): Promise<{ success: boolean; error?: string; computedAt?: string }> {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) {
    return { success: false, error: 'Permisiuni insuficiente' }
  }

  const track = await prisma.track.findFirst({
    where: { id: trackId, labelId: session.labelId },
    include: { artist: true },
  })
  if (!track) return { success: false, error: 'Piesă inexistentă' }
  if (!track.audioFile) return { success: false, error: 'Piesa nu are fișier audio asociat' }

  const result = await _upsertFingerprint(track, session.labelId)
  if (result.success) {
    revalidatePath(`/catalog/${trackId}`)
    revalidatePath('/compliance/fingerprints')
  }
  return result
}

// ── Calculează fingerprints — auto (lipsă) sau forțat (trackIds specifici) ───

export async function computeFingerprintsForLabel(trackIds?: string[]): Promise<{
  total: number
  succeeded: number
  failed: number
  errors: { trackId: string; trackTitle: string; error: string }[]
}> {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) {
    throw new Error('Permisiuni insuficiente')
  }

  const tracks = trackIds && trackIds.length > 0
    ? await prisma.track.findMany({
        where: {
          id:        { in: trackIds },
          labelId:   session.labelId,
          audioFile: { not: null },
        },
        include: { artist: true },
      })
    : await prisma.track.findMany({
        where: {
          labelId:     session.labelId,
          audioFile:   { not: null },
          fingerprint: { is: null },
        },
        include: { artist: true },
      })

  const validTracks = tracks.filter((t) => t.audioFile && t.audioFile.trim() !== '')
  const errors: { trackId: string; trackTitle: string; error: string }[] = []
  let succeeded = 0

  for (const track of validTracks) {
    const result = await _upsertFingerprint(track, session.labelId)
    if (result.success) {
      succeeded++
    } else {
      errors.push({ trackId: track.id, trackTitle: track.title, error: result.error })
    }
  }

  revalidatePath('/compliance/fingerprints')
  return { total: validTracks.length, succeeded, failed: errors.length, errors }
}

// ── Șterge fingerprint ────────────────────────────────────────────────────────

export async function deleteFingerprintForTrack(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/fingerprints')

  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/compliance/fingerprints')

  const track = await prisma.track.findFirst({ where: { id: trackId, labelId: session.labelId } })
  if (!track) redirect('/compliance/fingerprints')

  await prisma.audioFingerprint.deleteMany({ where: { trackId, labelId: session.labelId } })
  revalidatePath(`/catalog/${trackId}`)
  revalidatePath('/compliance/fingerprints')
  redirect('/compliance/fingerprints?success=deleted')
}

// ── Wrapper pentru pagina detaliu piesă (/catalog/[id]) ──────────────────────

export async function computeFingerprintFromCatalogPage(formData: FormData) {
  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/catalog')

  const result = await computeFingerprintForTrack(trackId)
  if (result.success) {
    redirect(`/catalog/${trackId}?success=fingerprint_computed`)
  } else {
    redirect(`/catalog/${trackId}?error=${encodeURIComponent(result.error ?? 'Eroare necunoscută')}`)
  }
}

// ── Wrapper pentru pagina /compliance/fingerprints (per-rând) ─────────────────

export async function computeFingerprintFromFingerprintsPage(formData: FormData) {
  const trackId = String(formData.get('trackId') || '').trim()
  if (!trackId) redirect('/compliance/fingerprints')

  const result = await computeFingerprintForTrack(trackId)
  if (result.success) {
    redirect('/compliance/fingerprints?success=computed')
  } else {
    redirect(`/compliance/fingerprints?error=${encodeURIComponent(result.error ?? 'Eroare necunoscută')}`)
  }
}

// ── Calcul automat: procesează tot ce lipsește ────────────────────────────────

export async function computeAllMissingFingerprintsAction() {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) {
    redirect('/compliance/fingerprints?error=' + encodeURIComponent('Permisiuni insuficiente'))
  }
  const result = await computeFingerprintsForLabel()
  const qs = new URLSearchParams({
    completed: String(result.succeeded),
    failed:    String(result.failed),
    total:     String(result.total),
    mode:      'auto',
  })
  redirect(`/compliance/fingerprints?${qs.toString()}`)
}

// ── Calcul manual: recalculează track-uri selectate ───────────────────────────

export async function computeSelectedFingerprintsAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) {
    redirect('/compliance/fingerprints?error=' + encodeURIComponent('Permisiuni insuficiente'))
  }
  const trackIds = formData.getAll('trackIds').map((v) => String(v)).filter(Boolean)
  if (trackIds.length === 0) {
    redirect('/compliance/fingerprints?error=' + encodeURIComponent('Nicio piesă selectată'))
  }
  const result = await computeFingerprintsForLabel(trackIds)
  const qs = new URLSearchParams({
    completed: String(result.succeeded),
    failed:    String(result.failed),
    total:     String(result.total),
    mode:      'manual',
  })
  redirect(`/compliance/fingerprints?${qs.toString()}`)
}
