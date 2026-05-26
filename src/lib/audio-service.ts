import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

export const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL ?? 'http://localhost:8000'

export type FingerprintResponse = {
  mfccMean: number[]
  chromaMean: number[]
  mfccMatrix: number[][]
  chromaMatrix: number[][]
  tempo: number
  duration: number
  sampleRate: number
  hopLength: number
}

export class AudioServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AudioServiceError'
  }
}

export async function checkAudioServiceHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`${AUDIO_SERVICE_URL}/health`, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json() as { status?: string; librosa_version?: string }
    return { ok: true, version: data.librosa_version }
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Timeout după 3 secunde' }
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return { ok: false, error: 'Serviciu inaccesibil (ECONNREFUSED)' }
    }
    return { ok: false, error: msg }
  }
}

export function resolveAudioFilePath(audioFile: string): string {
  if (
    audioFile.includes('/') ||
    audioFile.includes('\\') ||
    audioFile.includes('..') ||
    path.isAbsolute(audioFile)
  ) {
    throw new AudioServiceError(`Nume de fișier invalid: ${audioFile}`)
  }
  const absolutePath = path.join(process.cwd(), 'public', 'uploads', 'catalog', audioFile)
  if (!existsSync(absolutePath)) {
    throw new AudioServiceError(`Fișierul audio nu există pe disk: ${audioFile}. Încarcă fișierul din pagina de editare.`)
  }
  return absolutePath
}

// ── Tipuri pentru /compare ────────────────────────────────────────────────────

export type SegmentMatch = {
  startSec: number
  endSec: number
  score: number
}

export type TrackMatch = {
  trackId: string
  trackTitle: string
  artistName: string
  overallScore: number
  mfccSimilarity: number
  chromaSimilarity: number
  tempoMatch: number
  segments: SegmentMatch[]
}

export type CompareResponse = {
  suspectDuration: number
  suspectTempo: number
  matches: TrackMatch[]
  topMatchScore: number
  topMatchTrackId: string | null
}

export type CatalogTrackPayload = {
  trackId: string
  trackTitle: string
  artistName: string
  mfccMean: number[]
  chromaMean: number[]
  mfccMatrix: number[][]
  chromaMatrix: number[][]
  tempo: number
  duration: number
}

export async function compareAudioWithCatalog(
  audioFilePath: string,
  catalog: CatalogTrackPayload[],
  topK = 3,
): Promise<CompareResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  try {
    const buffer = await readFile(audioFilePath)
    const filename = path.basename(audioFilePath)
    const blob = new Blob([buffer])

    const form = new FormData()
    form.append('file', blob, filename)
    form.append('catalog_json', JSON.stringify(catalog))
    form.append('top_k', String(topK))

    const res = await fetch(`${AUDIO_SERVICE_URL}/compare`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const errData = await res.json() as { detail?: string }
        if (errData.detail) detail = errData.detail
      } catch { /* ignoră erori parsare */ }
      throw new AudioServiceError(`Serviciu audio: ${detail}`)
    }

    return res.json() as Promise<CompareResponse>
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof AudioServiceError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AudioServiceError('Analiză prea lentă — timeout 120s depășit.')
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      throw new AudioServiceError('Serviciu audio inaccesibil. Pornește cu npm run dev:all.')
    }
    throw new AudioServiceError(`Eroare neașteptată: ${msg}`)
  }
}

export async function extractFingerprint(audioFilePath: string): Promise<FingerprintResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const buffer = await readFile(audioFilePath)
    const blob = new Blob([buffer])
    const filename = path.basename(audioFilePath)

    const form = new FormData()
    form.append('file', blob, filename)

    const res = await fetch(`${AUDIO_SERVICE_URL}/extract`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const errData = await res.json() as { detail?: string }
        if (errData.detail) detail = errData.detail
      } catch { /* ignoră erori de parsare */ }
      throw new AudioServiceError(`Serviciu audio: ${detail}`)
    }

    return res.json() as Promise<FingerprintResponse>
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof AudioServiceError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AudioServiceError('Timeout la extragerea fingerprint-ului (60s depășit).')
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      throw new AudioServiceError('Serviciul audio nu este accesibil. Pornește cu npm run dev:all.')
    }
    throw new AudioServiceError(`Eroare neașteptată: ${msg}`)
  }
}
