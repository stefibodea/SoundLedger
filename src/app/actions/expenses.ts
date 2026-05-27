'use server'

import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth-guards'
import { canManageFinance } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const VALID_CATEGORIES = ['STUDIO', 'VIDEO', 'PROMO', 'DISTRIBUTIE', 'ALTELE']

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += char }
  }
  result.push(current)
  return result
}

export async function addExpenseAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const category    = formData.get('category')    as string
  const amount      = parseFloat(formData.get('amount') as string)
  const description = (formData.get('description') as string) || null
  const period      = formData.get('period')      as string
  const isRecoupable = formData.get('isRecoupable') === 'true'
  const artistId    = (formData.get('artistId') as string) || null

  if (!category || isNaN(amount) || amount <= 0 || !period) {
    redirect('/finance/cheltuieli?error=' + encodeURIComponent('Completează toate câmpurile obligatorii.'))
  }

  await prisma.expense.create({
    data: {
      category,
      amount,
      description,
      period,
      isRecoupable,
      labelId: session.labelId,
      artistId: artistId || null,
    },
  })

  redirect('/finance/cheltuieli?success=1')
}

export async function importExpensesCsvAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    redirect('/finance/cheltuieli?error=' + encodeURIComponent('Fișierul selectat este gol sau invalid.'))
  }

  try {
    const text  = await file.text()
    const lines = text.split(/\r?\n/)

    if (lines.length <= 1) {
      redirect('/finance/cheltuieli?error=' + encodeURIComponent('Fișierul nu conține date.'))
    }

    // Încarcă artiștii labelului pentru lookup după nume
    const artists = await prisma.artist.findMany({
      where:  { labelId: session.labelId },
      select: { id: true, name: true },
    })

    let importedCount = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cols = parseCsvLine(line)
      if (cols.length < 3) continue

      const period      = cols[0]?.trim()
      let   category    = cols[1]?.trim().toUpperCase()
      const amountRaw   = cols[2]?.trim().replace(',', '.')
      const description = cols[3]?.trim() || null
      const artistName  = cols[4]?.trim()
      const recoupRaw   = cols[5]?.trim().toLowerCase()

      if (!period || !/^\d{4}-\d{2}$/.test(period)) continue
      if (!VALID_CATEGORIES.includes(category)) category = 'ALTELE'
      const amount = parseFloat(amountRaw)
      if (isNaN(amount) || amount <= 0) continue

      const isRecoupable = recoupRaw === 'da' || recoupRaw === 'yes' || recoupRaw === 'true'

      const artist = artistName
        ? artists.find((a) => a.name.toLowerCase() === artistName.toLowerCase())
        : null

      await prisma.expense.create({
        data: {
          period,
          category,
          amount,
          description,
          isRecoupable,
          labelId:  session.labelId!,
          artistId: artist?.id ?? null,
        },
      })
      importedCount++
    }

    redirect(`/finance/cheltuieli?success=${importedCount}`)
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err
    redirect('/finance/cheltuieli?error=' + encodeURIComponent('Eroare la procesarea fișierului CSV.'))
  }
}

export async function deleteExpenseAction(formData: FormData) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const id = formData.get('id') as string

  await prisma.expense.delete({
    where: { id, labelId: session.labelId },
  })

  redirect('/finance/cheltuieli')
}
