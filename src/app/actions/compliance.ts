'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance, canManageCompliance, canActOnDetection } from '@/lib/roles'
import { analyzeSuspectTrack, generateText } from '@/lib/ai'
import { setAIPermissionSchema, analyzeSuspectSchema, issueCertificateSchema } from '@/lib/schemas'

function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('429') || msg.includes('quota') || msg.includes('Quota')
}

// ── Permisiuni AI ──────────────────────────────────────────────────────────────

export async function setAIPermissionAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance')

  const result = setAIPermissionSchema.safeParse({
    trackId:           formData.get('trackId'),
    returnArtist:      formData.get('returnArtist') ?? '',
    allowAITraining:   formData.get('allowAITraining'),
    allowResearchOnly: formData.get('allowResearchOnly'),
    requiresLicense:   formData.get('requiresLicense'),
    artistConsent:     formData.get('artistConsent'),
    consentDate:       formData.get('consentDate') ?? '',
    minCompensation:   formData.get('minCompensation') ?? '',
    notes:             formData.get('notes') ?? '',
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/compliance/permissions?error=${encodeURIComponent(msg)}`)
  }
  const { trackId, returnArtist, allowAITraining, allowResearchOnly, requiresLicense, artistConsent, consentDate, minCompensation, notes } = result.data

  // Verifică că piesa aparține labelului
  const track = await prisma.track.findUnique({ where: { id: trackId } })
  if (!track || track.labelId !== session.labelId) redirect('/compliance/permissions')

  const permData = {
    allowAITraining,
    allowResearchOnly,
    requiresLicense,
    artistConsent,
    consentDate: consentDate ? new Date(consentDate) : null,
    minCompensation,
    notes,
  }

  await prisma.aIPermission.upsert({
    where:  { trackId },
    create: { trackId, labelId: session.labelId, ...permData },
    update: permData,
  })

  const qs = new URLSearchParams({ saved: '1', trackId })
  if (returnArtist) qs.set('artist', returnArtist)
  redirect(`/compliance/permissions?${qs.toString()}`)
}

// ── Scanner — analizează piesă suspectă ───────────────────────────────────────

export async function analyzeSuspectAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const scanResult = analyzeSuspectSchema.safeParse({
    suspectUrl:    formData.get('suspectUrl'),
    suspectTitle:  formData.get('suspectTitle') ?? '',
    suspectArtist: formData.get('suspectArtist') ?? '',
    platform:      formData.get('platform') ?? '',
    notes:         formData.get('notes') ?? '',
  })
  if (!scanResult.success) {
    const msg = scanResult.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/compliance/scanner?error=${encodeURIComponent(msg)}`)
  }
  const { suspectUrl, suspectTitle, suspectArtist, platform, notes } = scanResult.data

  // Aduce catalogul labelului pentru comparație
  const catalogTracks = await prisma.track.findMany({
    where: { labelId: session.labelId },
    include: { artist: true },
    take: 50,
  })

  const input = {
    suspectUrl,
    suspectTitle,
    suspectArtist,
    catalogTracks: catalogTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist.name,
      genre: t.genre ?? undefined,
    })),
  }

  let detectionId: string | null = null
  try {
    const { similarityScore, matchedTrackIds, aiAnalysis } = await analyzeSuspectTrack(input)

    const detection = await prisma.aIDetection.create({
      data: {
        labelId: session.labelId,
        suspectUrl,
        suspectTitle: suspectTitle ?? null,
        suspectArtist: suspectArtist ?? null,
        platform: platform ?? null,
        notes,
        similarityScore,
        matchedTrackIds: matchedTrackIds.length > 0 ? JSON.stringify(matchedTrackIds) : null,
        aiAnalysis,
        reportedById: session.userId,
      },
    })
    detectionId = detection.id
  } catch (e) {
    if (isQuotaError(e)) redirect('/compliance/scanner?error=AI+temporar+indisponibil.+Cota+API+epuizata.')
    throw e
  }

  redirect(`/compliance/scanner?lastId=${detectionId}`)
}

// ── Actualizare status detecție ────────────────────────────────────────────────

export async function updateDetectionStatusAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canActOnDetection(session.role)) redirect('/compliance/scanner')

  const id     = String(formData.get('id')     || '').trim()
  const status = String(formData.get('status') || '').trim()
  const validStatuses = ['PENDING', 'CONFIRMED', 'DISMISSED', 'RESOLVED']

  if (!id || !validStatuses.includes(status)) redirect('/compliance/scanner')

  const detection = await prisma.aIDetection.findUnique({ where: { id } })
  if (!detection || detection.labelId !== session.labelId) redirect('/compliance/scanner')

  await prisma.aIDetection.update({ where: { id }, data: { status } })
  redirect('/compliance/scanner')
}

export async function markTakedownSentAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canActOnDetection(session.role)) redirect('/compliance/scanner')

  const id = String(formData.get('id') || '').trim()
  const detection = await prisma.aIDetection.findUnique({ where: { id } })
  if (!detection || detection.labelId !== session.labelId) redirect('/compliance/scanner')

  await prisma.aIDetection.update({ where: { id }, data: { takedownSent: true, status: 'CONFIRMED' } })
  redirect('/compliance/scanner?takedown=1')
}

export async function markCompensationClaimedAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canActOnDetection(session.role)) redirect('/compliance/scanner')

  const id = String(formData.get('id') || '').trim()
  const detection = await prisma.aIDetection.findUnique({ where: { id } })
  if (!detection || detection.labelId !== session.labelId) redirect('/compliance/scanner')

  await prisma.aIDetection.update({ where: { id }, data: { compensationClaimed: true } })
  redirect('/compliance/scanner?compensation=1')
}

// ── Certificate Human Made ─────────────────────────────────────────────────────

export async function issueCertificateAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/certificates')

  const certResult = issueCertificateSchema.safeParse({
    trackId:     formData.get('trackId'),
    declaration: formData.get('declaration'),
  })
  if (!certResult.success) {
    const msg = certResult.error.issues[0]?.message ?? 'Date incomplete'
    redirect(`/compliance/certificates?error=${encodeURIComponent(msg)}`)
  }
  const { trackId, declaration } = certResult.data

  const track = await prisma.track.findUnique({ where: { id: trackId } })
  if (!track || track.labelId !== session.labelId) redirect('/compliance/certificates')

  // Verifică că nu există deja un certificat activ
  const existing = await prisma.humanMadeCertificate.findUnique({ where: { trackId } })
  if (existing && !existing.isRevoked) redirect('/compliance/certificates?error=Piesa+are+deja+un+certificat+activ')

  const year = new Date().getFullYear()
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const certificateCode = `HM-${year}-${suffix}`

  await prisma.humanMadeCertificate.upsert({
    where: { trackId },
    create: {
      trackId,
      labelId: session.labelId,
      certificateCode,
      issuedAt: new Date(),
      issuedById: session.userId,
      declaration,
      isRevoked: false,
    },
    update: {
      certificateCode,
      issuedAt: new Date(),
      issuedById: session.userId,
      declaration,
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    },
  })

  redirect('/compliance/certificates?issued=1')
}

// Emite certificate pentru mai multe piese simultan (bulk)
export async function bulkIssueCertificatesAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/certificates')

  const trackIdsRaw = String(formData.get('trackIds') || '').trim()
  const declaration = String(formData.get('declaration') || '').trim()

  if (!trackIdsRaw || !declaration || declaration.length < 20) {
    redirect('/compliance/certificates?error=Date+incomplete+pentru+certificare+bulk')
  }

  const trackIds = trackIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)
  if (trackIds.length === 0) redirect('/compliance/certificates')

  // Verifică că toate piesele aparțin labelului curent
  const tracks = await prisma.track.findMany({
    where: { id: { in: trackIds }, labelId: session.labelId },
    select: { id: true },
  })
  const validIds = new Set(tracks.map((t) => t.id))

  const year = new Date().getFullYear()
  let count = 0

  for (const trackId of trackIds) {
    if (!validIds.has(trackId)) continue

    // Sărită dacă are deja certificat activ
    const existing = await prisma.humanMadeCertificate.findUnique({ where: { trackId } })
    if (existing && !existing.isRevoked) continue

    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const certificateCode = `HM-${year}-${suffix}`

    await prisma.humanMadeCertificate.upsert({
      where: { trackId },
      create: {
        trackId,
        labelId: session.labelId,
        certificateCode,
        issuedAt: new Date(),
        issuedById: session.userId,
        declaration,
        isRevoked: false,
      },
      update: {
        certificateCode,
        issuedAt: new Date(),
        issuedById: session.userId,
        declaration,
        isRevoked: false,
        revokedAt: null,
        revokedReason: null,
      },
    })
    count++
  }

  redirect(`/compliance/certificates?issued=${count}`)
}

export async function revokeCertificateAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance/certificates')

  const id     = String(formData.get('id')     || '').trim()
  const reason = String(formData.get('reason') || '').trim() || 'Revocat de Director General'

  const cert = await prisma.humanMadeCertificate.findUnique({ where: { id } })
  if (!cert || cert.labelId !== session.labelId) redirect('/compliance/certificates')

  await prisma.humanMadeCertificate.update({
    where: { id },
    data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
  })

  redirect('/compliance/certificates?revoked=1')
}

// ── Generează raport complet de compliance pentru label ────────────────────────

export async function generateComplianceReportAction() {
  const session = await requireSession()
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const [totalTracks, withPermissions, withCerts, openDetections] = await Promise.all([
    prisma.track.count({ where: { labelId: session.labelId } }),
    prisma.aIPermission.count({ where: { labelId: session.labelId } }),
    prisma.humanMadeCertificate.count({ where: { labelId: session.labelId, isRevoked: false } }),
    prisma.aIDetection.count({ where: { labelId: session.labelId, status: { in: ['PENDING', 'CONFIRMED'] } } }),
  ])

  const prompt = `Ești un expert în conformitate juridică și protecția drepturilor de autor în industria muzicală în era AI.

Generează un raport executiv de conformitate AI ("Human First") pentru un label muzical, în română.

Date label:
- Total piese în catalog: ${totalTracks}
- Piese cu permisiuni AI setate: ${withPermissions} din ${totalTracks}
- Piese certificate "Human Made": ${withCerts} din ${totalTracks}
- Detecții deschise (posibile utilizări neautorizate): ${openDetections}

Raportul trebuie să conțină EXACT aceste secțiuni:

**REZUMAT EXECUTIV**
2 propoziții despre starea conformității labelului.

**RISCURI IDENTIFICATE**
2-3 riscuri concrete bazate pe datele de mai sus.

**RECOMANDĂRI PRIORITARE**
Exact 3 acțiuni concrete, fiecare pe o linie cu prefix "→".

**CONCLUZIE**
O propoziție motivatoare despre importanța protecției drepturilor în era AI.`

  let errorMsg: string | null = null
  try {
    const report = await generateText(prompt)
    await prisma.notification.create({
      data: { userId: session.userId, message: report, type: 'AI_COMPLIANCE' },
    })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizata.'
    else throw e
  }

  if (errorMsg) redirect(`/compliance?error=${errorMsg}`)
  redirect('/compliance?report=1')
}
