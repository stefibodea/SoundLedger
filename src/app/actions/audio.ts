'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance } from '@/lib/roles'

const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL ?? 'http://localhost:8000'

// ── Calculează amprentă audio pentru o piesă din catalog ──────────────────────

export async function computeFingerprintAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/catalog')

  const trackId = String(formData.get('trackId') || '').trim()
  const file    = formData.get('audioFile') as File | null

  if (!trackId) redirect('/catalog')
  if (!file || file.size === 0) {
    redirect(`/catalog/${trackId}?fpError=${encodeURIComponent('Selectează un fișier audio.')}`)
  }

  const track = await prisma.track.findUnique({ where: { id: trackId } })
  if (!track || track.labelId !== session.labelId) redirect('/catalog')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = ['mp3', 'wav', 'flac', 'm4a', 'ogg']
  if (!allowed.includes(ext)) {
    redirect(`/catalog/${trackId}?fpError=${encodeURIComponent('Format neacceptat. Folosește mp3, wav, flac, m4a sau ogg.')}`)
  }

  try {
    const form = new FormData()
    form.append('file', file, file.name)

    const res = await fetch(`${AUDIO_SERVICE_URL}/extract`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.text()
      redirect(`/catalog/${trackId}?fpError=${encodeURIComponent(`Serviciu audio: ${err.slice(0, 120)}`)}`)
    }

    const fp = await res.json() as {
      mfccMean: number[]
      chromaMean: number[]
      mfccMatrix: number[][]
      chromaMatrix: number[][]
      tempo: number
      duration: number
      sampleRate: number
      hopLength: number
    }

    await prisma.audioFingerprint.upsert({
      where:  { trackId },
      create: {
        trackId,
        labelId:      session.labelId,
        mfccMean:     JSON.stringify(fp.mfccMean),
        chromaMean:   JSON.stringify(fp.chromaMean),
        mfccMatrix:   JSON.stringify(fp.mfccMatrix),
        chromaMatrix: JSON.stringify(fp.chromaMatrix),
        tempo:        fp.tempo,
        duration:     fp.duration,
        sampleRate:   fp.sampleRate,
        hopLength:    fp.hopLength,
        computedAt:   new Date(),
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
        computedAt:   new Date(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    redirect(`/catalog/${trackId}?fpError=${encodeURIComponent(msg.slice(0, 200))}`)
  }

  redirect(`/catalog/${trackId}?fpOk=1`)
}

// ── Rulează analiză similitudine audio pentru o detecție suspectă ─────────────

export async function runAudioAnalysisAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/scanner')

  const detectionId = String(formData.get('detectionId') || '').trim()
  const file        = formData.get('suspectAudioFile') as File | null

  if (!detectionId) redirect('/compliance/scanner')
  if (!file || file.size === 0) {
    redirect(`/compliance/scanner?lastId=${detectionId}&error=${encodeURIComponent('Selectează un fișier audio pentru piesa suspectă.')}`)
  }

  const detection = await prisma.aIDetection.findUnique({ where: { id: detectionId } })
  if (!detection || detection.labelId !== session.labelId) redirect('/compliance/scanner')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = ['mp3', 'wav', 'flac', 'm4a', 'ogg']
  if (!allowed.includes(ext)) {
    redirect(`/compliance/scanner?lastId=${detectionId}&error=${encodeURIComponent('Format neacceptat. Folosește mp3, wav, flac, m4a sau ogg.')}`)
  }

  // Aduce fingerprint-urile din catalog pentru acest label
  const fingerprints = await prisma.audioFingerprint.findMany({
    where:   { labelId: session.labelId },
    include: { track: { include: { artist: true } } },
  })

  if (fingerprints.length === 0) {
    redirect(`/compliance/scanner?lastId=${detectionId}&error=${encodeURIComponent('Nicio amprentă audio calculată în catalog. Calculează mai întâi din pagina pieselor.')}`)
  }

  const catalog = fingerprints.map((fp) => ({
    trackId:      fp.trackId,
    trackTitle:   fp.track.title,
    artistName:   fp.track.artist.name,
    mfccMean:     JSON.parse(fp.mfccMean) as number[],
    chromaMean:   JSON.parse(fp.chromaMean) as number[],
    mfccMatrix:   JSON.parse(fp.mfccMatrix) as number[][],
    chromaMatrix: JSON.parse(fp.chromaMatrix) as number[][],
    tempo:        fp.tempo,
    duration:     fp.duration,
  }))

  try {
    const form = new FormData()
    form.append('file', file, file.name)
    form.append('catalog_json', JSON.stringify(catalog))
    form.append('top_k', '5')

    const res = await fetch(`${AUDIO_SERVICE_URL}/compare`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.text()
      await prisma.aIDetection.update({
        where: { id: detectionId },
        data:  { analysisError: `HTTP ${res.status}: ${err.slice(0, 200)}`, analyzedAt: new Date() },
      })
      redirect(`/compliance/scanner?lastId=${detectionId}&error=${encodeURIComponent('Eroare serviciu audio.')}`)
    }

    const result = await res.json() as {
      suspectDuration: number
      suspectTempo: number
      matches: Array<{
        trackId: string
        trackTitle: string
        artistName: string
        overallScore: number
        mfccSimilarity: number
        chromaSimilarity: number
        tempoMatch: number
        segments: Array<{ startSec: number; endSec: number; score: number }>
      }>
      topMatchScore: number
      topMatchTrackId: string | null
    }

    const topMatch = result.matches[0] ?? null

    await prisma.aIDetection.update({
      where: { id: detectionId },
      data: {
        suspectAudioFile: file.name,
        suspectDuration:  result.suspectDuration,
        matches:          JSON.stringify(result),
        topMatchScore:    result.topMatchScore,
        topMatchTrackId:  result.topMatchTrackId ?? null,
        analyzedAt:       new Date(),
        analysisError:    null,
        // Actualizează similarityScore dacă scorul audio e mai ridicat
        similarityScore: topMatch
          ? Math.max(detection.similarityScore ?? 0, Math.round(topMatch.overallScore * 100))
          : detection.similarityScore,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.aIDetection.update({
      where: { id: detectionId },
      data:  { analysisError: msg.slice(0, 300), analyzedAt: new Date() },
    })
    redirect(`/compliance/scanner?lastId=${detectionId}&error=${encodeURIComponent('Eroare la analiza audio.')}`)
  }

  redirect(`/compliance/scanner?lastId=${detectionId}&audioOk=1`)
}
