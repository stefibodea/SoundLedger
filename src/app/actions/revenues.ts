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
  const { source, amount, period, artistId: artistIdRaw, streams, description } = result.data

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
