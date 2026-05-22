import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { canViewFinance } from '@/lib/roles'

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YouTube Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV (CREDIDAM/UCMR-ADA)',
  SYNC_LICENSING:      'Sync Licensing',
  LICENTIERE:          'Licentiere',
  VANZARI_FIZICE:      'Vanzari fizice',
  MERCHANDISE:         'Merchandise',
  ALTE_SURSE:          'Alte surse',
  // legacy
  STREAMING:           'Spotify',
  YOUTUBE:             'YouTube',
  LICENSING:           'Licentiere',
  PHYSICAL:            'Vanzari fizice',
  SYNC:                'Sync',
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.labelId || !canViewFinance(session.role)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const source     = searchParams.get('source')     || ''
  const artistId   = searchParams.get('artistId')   || ''
  const periodFrom = searchParams.get('periodFrom') || ''
  const periodTo   = searchParams.get('periodTo')   || ''

  const where: Record<string, unknown> = { labelId: session.labelId }
  if (source)   where.source   = source
  if (artistId) where.artistId = artistId
  if (periodFrom || periodTo) {
    const periodFilter: Record<string, string> = {}
    if (periodFrom) periodFilter.gte = periodFrom
    if (periodTo)   periodFilter.lte = periodTo
    where.period = periodFilter
  }

  const revenues = await prisma.revenue.findMany({
    where,
    include: { artist: true },
    orderBy: { period: 'desc' },
  })

  const header = ['Sursa', 'Suma (EUR)', 'Streamuri', 'Perioada', 'Artist', 'Descriere', 'Data inregistrare']
  const rows = revenues.map((r) => [
    SOURCE_LABELS[r.source] ?? r.source,
    r.amount.toFixed(2),
    r.streams?.toString() ?? '',
    r.period,
    r.artist?.name ?? '',
    r.description ?? '',
    new Date(r.createdAt).toLocaleDateString('ro-RO'),
  ])

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  const filename = `venituri-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
