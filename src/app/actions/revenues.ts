'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageFinance } from '@/lib/roles'
import { assertArtistBelongsToLabel } from '@/lib/tenant-security'
import { createRevenueSchema } from '@/lib/schemas'

export async function createRevenueAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    return importRevenueCsvAction(formData)
  }

  const result = createRevenueSchema.safeParse({
    source:      formData.get('source'),
    amount:      formData.get('amount'),
    period:      formData.get('period'),
    artistId:    formData.get('artistId') ?? '',
    streams:     formData.get('streams') ?? '',
    description: formData.get('description') ?? '',
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/finance?error=${encodeURIComponent(msg)}`)
  }
  const { source, amount, period, artistId: artistIdRaw, streams, description: descRaw } = result.data
  const description = descRaw?.trim() || `Venit manual — ${source} ${period}`

  const revenueStatus =
    formData.get('revenueStatus') === 'RECONCILIAT' ? 'RECONCILIAT' : 'ESTIMAT'

  if (artistIdRaw) {
    await assertArtistBelongsToLabel(artistIdRaw, session.labelId, '/finance?error=Artist+invalid')
  }

  const revenue = await prisma.revenue.create({
    data: { source, amount, streams, period, description, revenueStatus, labelId: session.labelId, artistId: artistIdRaw },
  })

  // Calcul automat royalty dacă există artist cu contract activ
  if (artistIdRaw) {
    const contract = await prisma.contract.findFirst({
      where: { artistId: artistIdRaw, labelId: session.labelId, status: 'ACTIVE' },
    })

    if (contract && contract.royaltyPercent > 0) {
      const royaltyAmount = Math.round((amount * contract.royaltyPercent) / 100 * 100) / 100

      await prisma.royaltyPayment.create({
        data: {
          artistId: artistIdRaw,
          contractId: contract.id,
          labelId: session.labelId,
          amount: royaltyAmount,
          period,
          status: 'PENDING',
          revenueId: revenue.id,
          notes: `Generat automat din venit ${source} ${period} — ${contract.royaltyPercent}% din ${amount}€`,
        },
      })

      const artist = await prisma.artist.findUnique({
        where: { id: artistIdRaw },
        select: { name: true },
      })

      const artistName = encodeURIComponent(artist?.name ?? '')
      redirect(
        `/finance?success=royalty_generated&amount=${royaltyAmount}&artist=${artistName}&percent=${contract.royaltyPercent}`,
      )
    } else {
      console.log(`Nu s-a găsit contract activ pentru artistul ${artistIdRaw}`)
    }
  }

  redirect('/finance')
}

export async function updateRevenueAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/finance')

  const revenue = await prisma.revenue.findUnique({ where: { id } })
  if (!revenue || revenue.labelId !== session.labelId) redirect('/finance')

  const source  = String(formData.get('source')  || '')
  const amount  = Number(formData.get('amount')   || 0)
  const period  = String(formData.get('period')   || '').trim()
  const artistIdRaw = String(formData.get('artistId') || '')
  const streamsRaw  = formData.get('streams')
  const streams = streamsRaw ? parseInt(String(streamsRaw)) : null
  const description = String(formData.get('description') || '').trim() || null

  if (!source || !period || Number.isNaN(amount) || amount <= 0) {
    redirect(`/finance/${id}?error=Date+incomplete`)
  }

  if (artistIdRaw) {
    await assertArtistBelongsToLabel(artistIdRaw, session.labelId, `/finance/${id}?error=Artist+invalid`)
  }

  await prisma.revenue.update({
    where: { id },
    data: {
      source,
      amount,
      streams: streams && !Number.isNaN(streams) ? streams : null,
      period,
      description,
      artistId: artistIdRaw || null,
    },
  })

  redirect('/finance')
}

export async function deleteRevenueAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/finance')

  const revenue = await prisma.revenue.findUnique({ where: { id } })
  if (!revenue || revenue.labelId !== session.labelId) redirect('/finance')

  await prisma.revenue.delete({ where: { id } })
  redirect('/finance')
}

export async function reconcileRevenueAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const id = String(formData.get('id') || '').trim()
  if (!id) redirect('/finance')

  const revenue = await prisma.revenue.findUnique({ where: { id } })
  if (!revenue || revenue.labelId !== session.labelId) redirect('/finance')

  await prisma.revenue.update({
    where: { id },
    data: { revenueStatus: 'RECONCILIAT' },
  })

  revalidatePath('/finance')
}

export async function markRoyaltyPaidAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/finance/royalties')

  const royaltyId = String(formData.get('royaltyId') || '').trim()
  if (!royaltyId) redirect('/finance/royalties')

  const royalty = await prisma.royaltyPayment.findUnique({ where: { id: royaltyId } })
  if (!royalty || royalty.labelId !== session.labelId) redirect('/finance/royalties')

  await prisma.royaltyPayment.update({
    where: { id: royaltyId },
    data: { status: 'PAID', paidAt: new Date() },
  })

  revalidatePath('/finance/royalties')
  revalidatePath('/finance')
}

export async function cancelRoyaltyAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/finance/royalties')

  const royaltyId = String(formData.get('royaltyId') || '').trim()
  if (!royaltyId) redirect('/finance/royalties')

  const royalty = await prisma.royaltyPayment.findUnique({ where: { id: royaltyId } })
  if (!royalty || royalty.labelId !== session.labelId || royalty.status !== 'PENDING') {
    redirect('/finance/royalties')
  }

  await prisma.royaltyPayment.update({
    where: { id: royaltyId },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/finance/royalties')
  revalidatePath('/finance')
}

// ── CSV Importer Helper ──────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

const VALID_REVENUE_SOURCES = [
  'SPOTIFY', 'APPLE_MUSIC', 'YOUTUBE_MUSIC', 'YOUTUBE_CONTENT_ID', 'TIKTOK', 'DEEZER',
  'RADIO_TV', 'SYNC_LICENSING', 'LICENTIERE', 'VANZARI_FIZICE', 'MERCHANDISE', 'ALTE_SURSE'
]

export async function importRevenueCsvAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    redirect('/finance?error=Fisierul+selectat+este+gol+sau+invalid')
  }

  let redirectUrl = ''
  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/)

    if (lines.length <= 1) {
      redirectUrl = '/finance?error=Fisierul+nu+contine+suficiente+date'
    } else {
      let importedCount = 0
      let totalAmount = 0

      // Parcurgem rândurile ignorând antetul (prima linie)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const cols = parseCsvLine(line)
        if (cols.length < 6) continue // Rând incomplet

        const isrc = cols[0]?.trim()
        const title = cols[1]?.trim()
        // const artistName = cols[2]?.trim()
        let source = cols[3]?.trim()?.toUpperCase() || 'SPOTIFY'
        const streamsRaw = cols[4]?.trim()
        const amountRaw = cols[5]?.trim()
        const period = cols[6]?.trim() || '2026-04'

        // Validăm sursa
        if (!VALID_REVENUE_SOURCES.includes(source)) {
          source = 'SPOTIFY' // Fallback la o sursă validă
        }

        const amount = Number(amountRaw)
        if (Number.isNaN(amount) || amount <= 0) continue // Skip invalid amount

        const streams = streamsRaw ? parseInt(streamsRaw) : null

        // Căutăm piesa în baza de date
        let matchedTrack = null
        if (isrc) {
          matchedTrack = await prisma.track.findFirst({
            where: { isrc: isrc, labelId: session.labelId },
            include: { artist: true },
          })
        }

        if (!matchedTrack && title) {
          matchedTrack = await prisma.track.findFirst({
            where: { title: { equals: title }, labelId: session.labelId },
            include: { artist: true },
          })
        }

        // Adăugăm înregistrarea de venit
        const revenue = await prisma.revenue.create({
          data: {
            source,
            amount,
            streams: streams && !Number.isNaN(streams) ? streams : null,
            period,
            description: `Import CSV ISRC: ${isrc || 'lipsă'}`,
            revenueStatus: 'RECONCILIAT', // Statement-urile digitale importate sunt confirmate
            labelId: session.labelId,
            artistId: matchedTrack ? matchedTrack.artistId : null,
            trackId: matchedTrack ? matchedTrack.id : null,
          },
        })

        // Dacă am mapat piesa către un artist cu contract activ, generăm royalty-ul automat
        if (matchedTrack) {
          const contract = await prisma.contract.findFirst({
            where: { artistId: matchedTrack.artistId, labelId: session.labelId, status: 'ACTIVE' },
          })

          if (contract && contract.royaltyPercent > 0) {
            const royaltyAmount = Math.round(((amount * contract.royaltyPercent) / 100) * 100) / 100

            await prisma.royaltyPayment.create({
              data: {
                artistId: matchedTrack.artistId,
                contractId: contract.id,
                labelId: session.labelId,
                amount: royaltyAmount,
                period,
                status: 'PENDING',
                revenueId: revenue.id,
                notes: `Generat automat la importul CSV pentru piesa "${matchedTrack.title}" — ${contract.royaltyPercent}% din ${amount}€`,
              },
            })
          }
        }

        importedCount++
        totalAmount += amount
      }

      revalidatePath('/finance')
      revalidatePath('/finance/royalties')

      redirectUrl = `/finance?success=csv_imported&count=${importedCount}&total=${totalAmount.toFixed(2)}`
    }
  } catch (error) {
    console.error('Eroare la importul CSV:', error)
    redirectUrl = '/finance?error=Eroare+la+procesarea+fisierului+CSV'
  }

  if (redirectUrl) {
    redirect(redirectUrl)
  }
}

