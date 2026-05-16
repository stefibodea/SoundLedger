// Script CLI pentru calculul bulk al fingerprint-urilor audio
// Rulează cu: node scripts/seed-fingerprints.mjs [--force] [--label=<id>]
// Node 20+ necesar (fetch și FormData native)

import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL ?? 'http://localhost:8000'

// ── Parsare argumente ─────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const labelArg = args.find((a) => a.startsWith('--label='))
const LABEL_ID = labelArg ? labelArg.split('=')[1] : null

// ── Health check ──────────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const res = await fetch(`${AUDIO_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { ok: true, version: data.librosa_version }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

// ── Extragere fingerprint ─────────────────────────────────────────────────────

async function extractFingerprint(audioFilePath) {
  const buffer = await readFile(audioFilePath)
  const blob = new Blob([buffer])
  const filename = path.basename(audioFilePath)

  const form = new FormData()
  form.append('file', blob, filename)

  const res = await fetch(`${AUDIO_SERVICE_URL}/extract`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errData = await res.json()
      if (errData.detail) detail = errData.detail
    } catch { /* ignoră */ }
    throw new Error(`Serviciu audio: ${detail}`)
  }

  return res.json()
}

// ── Main ──────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

async function main() {
  console.log('\n🎵 SoundLedger — Seed fingerprints audio')
  console.log(`   Serviciu: ${AUDIO_SERVICE_URL}`)
  console.log(`   --force: ${FORCE}`)
  if (LABEL_ID) console.log(`   --label: ${LABEL_ID}`)
  console.log()

  // Health check
  const health = await checkHealth()
  if (!health.ok) {
    console.error(`✗ Serviciul audio nu este accesibil: ${health.error}`)
    console.error('  Pornește cu: npm run dev:all sau npm run dev:audio')
    process.exit(1)
  }
  console.log(`✓ Serviciu audio activ — librosa v${health.version}\n`)

  // Listează track-uri
  const where = {
    audioFile: { not: null },
    ...(LABEL_ID ? { labelId: LABEL_ID } : {}),
  }

  const tracks = await prisma.track.findMany({
    where,
    include: { artist: true, fingerprint: true },
    orderBy: { createdAt: 'asc' },
  })

  const eligible = tracks.filter((t) => t.audioFile && t.audioFile.trim() !== '')

  if (eligible.length === 0) {
    console.log('⚠ Nicio piesă cu fișier audio găsită.')
    await prisma.$disconnect()
    return
  }

  console.log(`📋 ${eligible.length} piese cu audio găsite.\n`)

  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < eligible.length; i++) {
    const track = eligible[i]
    const prefix = `[${i + 1}/${eligible.length}]`

    if (track.fingerprint && !FORCE) {
      console.log(`${prefix} ⏭  "${track.title}" by "${track.artist.name}" — skip (fingerprint există, folosește --force pentru recalcul)`)
      skipped++
      continue
    }

    const audioPath = path.join(ROOT, 'public', 'uploads', 'catalog', track.audioFile)
    if (!existsSync(audioPath)) {
      console.log(`${prefix} ✗  "${track.title}" — Fișierul nu există pe disk: ${track.audioFile}`)
      failed++
      continue
    }

    try {
      const fp = await extractFingerprint(audioPath)
      const now = new Date()

      await prisma.audioFingerprint.upsert({
        where: { trackId: track.id },
        create: {
          trackId:     track.id,
          labelId:     track.labelId,
          mfccMean:    JSON.stringify(fp.mfccMean),
          chromaMean:  JSON.stringify(fp.chromaMean),
          mfccMatrix:  JSON.stringify(fp.mfccMatrix),
          chromaMatrix: JSON.stringify(fp.chromaMatrix),
          tempo:       fp.tempo,
          duration:    fp.duration,
          sampleRate:  fp.sampleRate,
          hopLength:   fp.hopLength,
          computedAt:  now,
        },
        update: {
          mfccMean:    JSON.stringify(fp.mfccMean),
          chromaMean:  JSON.stringify(fp.chromaMean),
          mfccMatrix:  JSON.stringify(fp.mfccMatrix),
          chromaMatrix: JSON.stringify(fp.chromaMatrix),
          tempo:       fp.tempo,
          duration:    fp.duration,
          sampleRate:  fp.sampleRate,
          hopLength:   fp.hopLength,
          computedAt:  now,
        },
      })

      console.log(`${prefix} ✓  "${track.title}" by "${track.artist.name}" — tempo=${fp.tempo.toFixed(1)} BPM, durată=${fp.duration.toFixed(1)}s`)
      succeeded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`${prefix} ✗  "${track.title}" — ${msg}`)
      failed++
    }
  }

  console.log('\n── Rezumat ──────────────────────────────────')
  console.log(`   Total:   ${eligible.length}`)
  console.log(`   ✓ Reușite: ${succeeded}`)
  if (skipped > 0) console.log(`   ⏭ Sărite:  ${skipped}`)
  if (failed  > 0) console.log(`   ✗ Eșuate:  ${failed}`)
  console.log()
}

main()
  .catch((err) => {
    console.error('Eroare fatală:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
