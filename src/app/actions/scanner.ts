'use server'

import path from 'path'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance, canActOnDetection } from '@/lib/roles'
import { isValidAudioFile, saveSuspectAudioFile } from '@/lib/file-upload'
import { compareAudioWithCatalog, type CatalogTrackPayload } from '@/lib/audio-service'
import { generateText } from '@/lib/ai'

export async function analyzeSuspectTrackAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) {
    redirect(`/compliance/scanner?error=${encodeURIComponent('Acces interzis.')}`)
  }

  const file          = formData.get('file') as File | null
  const suspectTitle  = String(formData.get('suspectTitle')  || '').trim() || null
  const suspectArtist = String(formData.get('suspectArtist') || '').trim() || null
  const platform      = String(formData.get('platform')      || '').trim() || null
  const suspectUrl    = String(formData.get('suspectUrl')    || '').trim()
  const notes         = String(formData.get('notes')         || '').trim() || null

  if (!file || file.size === 0) {
    redirect(`/compliance/scanner?error=${encodeURIComponent('Fișier audio lipsă.')}`)
  }

  const validation = isValidAudioFile(file)
  if (!validation.ok) {
    redirect(`/compliance/scanner?error=${encodeURIComponent(validation.error ?? 'Fișier invalid.')}`)
  }

  // a) Creează detecția inițială
  const detection = await prisma.aIDetection.create({
    data: {
      labelId:      session.labelId,
      suspectUrl,
      suspectTitle,
      suspectArtist,
      platform,
      notes,
      reportedById: session.userId,
      status:       'PENDING',
    },
  })

  // b) Salvează fișierul audio
  let filename: string
  try {
    filename = await saveSuspectAudioFile(file, detection.id)
    await prisma.aIDetection.update({
      where: { id: detection.id },
      data:  { suspectAudioFile: filename },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.aIDetection.update({
      where: { id: detection.id },
      data:  { analysisError: `Eroare salvare fișier: ${msg}` },
    })
    redirect(`/compliance/scanner?error=${encodeURIComponent('Eroare la salvarea fișierului audio.')}`)
  }

  // c) Citește fingerprint-urile din catalog
  const fingerprints = await prisma.audioFingerprint.findMany({
    where:   { labelId: session.labelId },
    include: { track: { include: { artist: true } } },
  })

  if (fingerprints.length === 0) {
    await prisma.aIDetection.update({
      where: { id: detection.id },
      data:  { analysisError: 'Catalogul nu are fingerprints calculate. Mergi la /catalog pentru a calcula.' },
    })
    redirect(`/compliance/scanner?error=catalog_empty`)
  }

  // d) Construiește payload catalog
  const catalog: CatalogTrackPayload[] = fingerprints.map((fp) => ({
    trackId:      fp.trackId,
    trackTitle:   fp.track.title,
    artistName:   fp.track.artist?.name ?? 'Artist necunoscut',
    mfccMean:     JSON.parse(fp.mfccMean) as number[],
    chromaMean:   JSON.parse(fp.chromaMean) as number[],
    mfccMatrix:   JSON.parse(fp.mfccMatrix) as number[][],
    chromaMatrix: JSON.parse(fp.chromaMatrix) as number[][],
    tempo:        fp.tempo,
    duration:     fp.duration,
  }))

  try {
    // e) Apelează serviciul Python
    const audioPath = path.join(process.cwd(), 'public', 'uploads', 'suspects', filename)
    const result = await compareAudioWithCatalog(audioPath, catalog, 3)

    // f) Actualizează detecția cu rezultatele
    await prisma.aIDetection.update({
      where: { id: detection.id },
      data: {
        matches:         JSON.stringify(result.matches),
        topMatchScore:   result.topMatchScore,
        topMatchTrackId: result.topMatchTrackId,
        suspectDuration: result.suspectDuration,
        similarityScore: result.topMatchScore,
        matchedTrackIds: JSON.stringify(result.matches.slice(0, 3).map((m) => m.trackId)),
        analyzedAt:      new Date(),
        analysisError:   null,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[scanner] Eroare la analiza audio:', e)
    await prisma.aIDetection.update({
      where: { id: detection.id },
      data:  { analysisError: msg.slice(0, 300) },
    })
  }

  revalidatePath('/compliance/scanner')
  redirect(`/compliance/scanner/${detection.id}`)
}

// ── Actualizare status din pagina de raport ───────────────────────────────────

export async function updateDetectionStatusFromReportAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canActOnDetection(session.role)) redirect('/compliance/scanner')

  const id        = String(formData.get('id')     || '').trim()
  const newStatus = String(formData.get('status') || '').trim()
  const valid     = ['PENDING', 'CONFIRMED', 'DISMISSED', 'RESOLVED']

  if (!id || !valid.includes(newStatus)) redirect('/compliance/scanner')

  const detection = await prisma.aIDetection.findFirst({ where: { id, labelId: session.labelId } })
  if (!detection) redirect('/compliance/scanner')

  await prisma.aIDetection.update({ where: { id }, data: { status: newStatus } })
  revalidatePath(`/compliance/scanner/${id}`)
  redirect(`/compliance/scanner/${id}`)
}

// ── Generare raport AI pentru o detecție ─────────────────────────────────────

type ParsedMatch = {
  trackId: string
  trackTitle: string
  artistName: string
  overallScore: number
  mfccSimilarity: number
  chromaSimilarity: number
  tempoMatch: number
  segments: Array<{ startSec: number; endSec: number; score: number }>
  permissionStatus: 'allowed' | 'denied' | 'no_permission_set'
}

export async function generateDetectionAnalysisAction(detectionId: string): Promise<void> {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) return

  const detection = await prisma.aIDetection.findFirst({
    where: { id: detectionId, labelId: session.labelId },
  })
  if (!detection) return

  const matches: ParsedMatch[] = detection.matches ? JSON.parse(detection.matches) : []
  const top = matches[0]

  const permLabel = (s: string) =>
    s === 'denied' ? 'interzis explicit (risc juridic maxim)'
    : s === 'allowed' ? 'permis de label'
    : 'nesetat (lipsă consimțământ documentat)'

  const segmentsText = top?.segments?.length
    ? top.segments.map((s) => `  • ${s.startSec.toFixed(1)}s–${s.endSec.toFixed(1)}s (scor: ${Math.round(s.score * 100)}%)`).join('\n')
    : '  • Nu s-au detectat segmente similare cu prag > 85%'

  const prompt = `Ești un expert în drepturi de autor muzicale. Analizează rezultatele de similaritate audio și oferă un raport în limba română pentru managementul unei case de discuri.

Piesă suspectă: ${detection.suspectTitle ?? 'Necunoscut'} de ${detection.suspectArtist ?? 'Necunoscut'} (${detection.platform ?? 'platformă necunoscută'})

Rezultate analiză ML:
- Top match: ${top?.trackTitle ?? 'N/A'} de ${top?.artistName ?? 'N/A'}
- Similaritate overall: ${top ? Math.round(top.overallScore * 100) : 0}%
- Similaritate MFCC (timbru/voce): ${top ? Math.round(top.mfccSimilarity * 100) : 0}%
- Similaritate Chroma (armonie/melodie): ${top ? Math.round(top.chromaSimilarity * 100) : 0}%
- Match tempo: ${top ? Math.round(top.tempoMatch * 100) : 0}%
- Segmente similare identificate:
${segmentsText}
- Status permisiuni AI pentru piesa din catalog: ${top ? permLabel(top.permissionStatus) : 'N/A'}

Structurează răspunsul în 4 secțiuni concise:
1. **Interpretarea scorurilor** — ce semnifică valorile MFCC, chroma și overall în context muzical
2. **Probabilitatea de utilizare neautorizată** — estimare și justificare
3. **Recomandare de acțiune** — takedown DMCA / investigație aprofundată / ignorare, cu motivație
4. **Argumentație juridică succintă** — referire la drepturile de autor și implicații legale`

  try {
    const analysis = await generateText(prompt)
    await prisma.aIDetection.update({
      where: { id: detectionId },
      data:  { aiAnalysis: analysis },
    })
    revalidatePath(`/compliance/scanner/${detectionId}`)
  } catch {
    // Eroarea e silențioasă — clientul verifică cu router.refresh()
  }
}
