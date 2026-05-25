'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageContracts } from '@/lib/roles'
import { assertArtistBelongsToLabel } from '@/lib/tenant-security'
import { createContractSchema } from '@/lib/schemas'

export async function createContractAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageContracts(session.role)) {
    redirect('/dashboard')
  }

  const result = createContractSchema.safeParse({
    artistId:       formData.get('artistId'),
    duration:       formData.get('duration'),
    royaltyPercent: formData.get('royaltyPercent'),
    advance:        formData.get('advance') ?? '',
    startDate:      formData.get('startDate') ?? '',
    endDate:        formData.get('endDate') ?? '',
    status:         formData.get('status') ?? '',
    signedAt:       formData.get('signedAt') ?? '',
    documentUrl:    formData.get('documentUrl') ?? '',
    specialClauses: formData.get('specialClauses') ?? '',
    territories:    formData.getAll('territories') as string[],
    rights:         formData.getAll('rights') as string[],
  })
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/contracts?error=${encodeURIComponent(msg)}`)
  }
  const { artistId, duration, royaltyPercent, advance, startDate, endDate,
          status, signedAt, documentUrl, specialClauses, territories, rights } = result.data

  await assertArtistBelongsToLabel(artistId, session.labelId, '/contracts?error=Artist+invalid')

  await prisma.contract.create({
    data: {
      artistId,
      labelId: session.labelId,
      duration,
      royaltyPercent,
      advance,
      startDate,
      endDate,
      status: status || 'ACTIVE',
      signedAt:       signedAt       ? new Date(signedAt)  : null,
      documentUrl:    documentUrl    ?? null,
      specialClauses: specialClauses ?? null,
      territories:    territories    ?? null,
      rights:         rights         ?? null,
    },
  })

  redirect('/contracts')
}
