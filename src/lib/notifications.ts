import { prisma } from './prisma'

export type NotificationItem = {
  id: string
  priority: 'alert' | 'action' | 'info'
  icon: string
  color: string
  text: string
  href: string
  linkText: string
}

export async function getNotificationsForLabel(labelId: string): Promise<NotificationItem[]> {
  const notes: NotificationItem[] = []
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    expiringContracts,
    pendingDetections,
    upcomingReleases,
    prospectsNeedingAttention,
  ] = await Promise.all([
    prisma.contract.findMany({
      where: { labelId, status: 'EXPIRING' },
      include: { artist: true },
      take: 3,
    }),
    prisma.aIDetection.count({
      where: { labelId, status: 'PENDING' },
    }),
    prisma.release.findMany({
      where: { labelId, status: { not: 'RELEASED' } },
      include: { track: { include: { artist: { select: { name: true } } } } },
      orderBy: { releaseDate: 'asc' },
      take: 5,
    }),
    prisma.aRProspect.count({
      where: {
        labelId,
        status: { in: ['IDENTIFIED', 'ANALYZING'] },
        createdAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  // Contracte expirabile → alertă
  for (const c of expiringContracts) {
    notes.push({
      id: `contract-${c.id}`,
      priority: 'alert',
      icon: '🔴',
      color: 'var(--role-artist-dark)',
      text: `Contractul lui ${c.artist.name} expiră curând`,
      href: '/contracts',
      linkText: 'Vezi contractul →',
    })
  }

  // Detecții AI în așteptare → alertă
  if (pendingDetections > 0) {
    notes.push({
      id: 'ai-detections',
      priority: 'alert',
      icon: '🔴',
      color: 'var(--role-artist-dark)',
      text: `${pendingDetections} detecție${pendingDetections > 1 ? 'i' : ''} AI suspectă${pendingDetections > 1 ? '' : ''} în așteptare`,
      href: '/compliance/scanner',
      linkText: 'Investighează →',
    })
  }

  // Lansări în maxim 7 zile → acțiune
  for (const r of upcomingReleases) {
    const releaseDate = new Date(r.releaseDate)
    if (releaseDate <= in7Days) {
      const daysUntil = Math.ceil((releaseDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const name = r.track?.title ?? 'lansare'
      notes.push({
        id: `release-${r.id}`,
        priority: 'action',
        icon: '🟡',
        color: 'var(--role-finance-dark)',
        text: `„${name}" se lansează ${daysUntil <= 0 ? 'azi' : `în ${daysUntil} ${daysUntil === 1 ? 'zi' : 'zile'}`}`,
        href: '/releases',
        linkText: 'Vezi lansarea →',
      })
    }
  }

  // Prospecte A&R nerevizuite >7 zile → info
  if (prospectsNeedingAttention > 0) {
    notes.push({
      id: 'ar-prospects',
      priority: 'info',
      icon: '🟢',
      color: 'var(--role-ar-dark)',
      text: `${prospectsNeedingAttention} prospect${prospectsNeedingAttention > 1 ? 'e' : ''} A&R ${prospectsNeedingAttention === 1 ? 'necesită' : 'necesită'} atenție`,
      href: '/ar',
      linkText: 'Analizează →',
    })
  }

  // Sortare: alerte → acțiuni → info
  const order = { alert: 0, action: 1, info: 2 }
  return notes.sort((a, b) => order[a.priority] - order[b.priority])
}
