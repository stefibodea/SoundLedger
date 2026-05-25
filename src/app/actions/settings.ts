'use server'

import { redirect } from 'next/navigation'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'

export async function updateLabelAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const name    = String(formData.get('name')    || '').trim()
  const country = String(formData.get('country') || '').trim()
  const city    = String(formData.get('city')    || '').trim()
  const genre   = String(formData.get('genre')   || '').trim()

  if (!name || !country || !city || !genre) {
    redirect('/settings/label?error=' + encodeURIComponent('Toate câmpurile sunt obligatorii'))
  }

  const logoFile = formData.get('logo') as File | null
  let logoPath: string | undefined

  if (logoFile && logoFile.size > 0) {
    const bytes  = await logoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext    = logoFile.name.split('.').pop() ?? 'png'
    const filename = `label-${session.labelId}.${ext}`
    const dir = join(process.cwd(), 'public', 'uploads', 'logos')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), buffer)
    logoPath = `/uploads/logos/${filename}`
  }

  await prisma.label.update({
    where: { id: session.labelId },
    data: {
      name,
      country,
      city,
      genre,
      ...(logoPath ? { logo: logoPath } : {}),
    },
  })

  redirect('/settings/label?success=1')
}
