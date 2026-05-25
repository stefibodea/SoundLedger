'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { generateText } from '@/lib/ai'

function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('429') || msg.includes('quota') || msg.includes('Quota')
}

// ── A&R: Generează scor AI pentru un prospect ──────────────────────────────
export async function generateProspectAIScoreAction(formData: FormData) {
  const session = await requireSession()
  const prospectId = formData.get('prospectId') as string
  const returnUrl = String(formData.get('returnUrl') || '').trim() || '/ar'

  const prospect = await prisma.aRProspect.findUnique({ where: { id: prospectId } })
  if (!prospect || prospect.labelId !== session.labelId) redirect('/ar')

  const links = [
    prospect.spotifyUrl && `Spotify: ${prospect.spotifyUrl}`,
    prospect.youtubeUrl && `YouTube: ${prospect.youtubeUrl}`,
    prospect.instagram && `Instagram: ${prospect.instagram}`,
    prospect.tiktok && `TikTok: ${prospect.tiktok}`,
    prospect.soundcloudUrl && `SoundCloud: ${prospect.soundcloudUrl}`,
  ].filter(Boolean).join('\n')

  const prompt = `Ești un A&R manager experimentat la o casă de discuri. Analizează următorul prospect artist și oferă:
1. Un scor de potențial între 0 și 100 (scrie EXACT "SCOR: X" pe prima linie, unde X este un număr)
2. Un raport scurt de 3-4 propoziții în română despre potențialul artistului

Artist: ${prospect.name}
${links ? `Link-uri:\n${links}` : ''}
${prospect.notes ? `Note: ${prospect.notes}` : ''}
Status curent în pipeline: ${prospect.status}

Răspunde în română. Prima linie trebuie să fie "SCOR: X" (număr de la 0 la 100).`

  let errorMsg: string | null = null
  try {
    const text = await generateText(prompt)
    const scoreMatch = text.match(/SCOR:\s*(\d+)/i)
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : null
    const report = text.replace(/SCOR:\s*\d+\n?/i, '').trim()
    await prisma.aRProspect.update({ where: { id: prospectId }, data: { aiScore: score, aiReport: report } })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizată.'
    else throw e
  }

  if (errorMsg) redirect(`${returnUrl.startsWith('/ar') ? returnUrl.split('?')[0] : '/ar'}?error=${errorMsg}`)
  redirect(returnUrl)
}

// ── Finanțe: Generează raport financiar AI ────────────────────────────────
export async function generateFinanceReportAction() {
  const session = await requireSession()
  if (!session.labelId) redirect('/finance')

  const revenues = await prisma.revenue.findMany({
    where: { labelId: session.labelId },
    include: { artist: true },
    orderBy: { period: 'asc' },
  })

  if (revenues.length === 0) redirect('/finance?error=Nu+exista+date+financiare+de+analizat')

  // Aggregate monthly totals
  const monthlyMap = new Map<string, number>()
  for (const r of revenues) {
    monthlyMap.set(r.period, (monthlyMap.get(r.period) ?? 0) + r.amount)
  }
  const monthly = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6)

  // Per source totals
  const sourceMap = new Map<string, number>()
  for (const r of revenues) sourceMap.set(r.source, (sourceMap.get(r.source) ?? 0) + r.amount)
  const bySrc = Array.from(sourceMap.entries()).sort(([, a], [, b]) => b - a)

  // Per artist totals
  const artistMap = new Map<string, number>()
  for (const r of revenues) {
    const key = r.artist?.name ?? 'fara artist'
    artistMap.set(key, (artistMap.get(key) ?? 0) + r.amount)
  }
  const byArtist = Array.from(artistMap.entries()).sort(([, a], [, b]) => b - a).slice(0, 5)

  // Anomaly detection: entries with amount > 3x average
  const avg = revenues.reduce((s, r) => s + r.amount, 0) / revenues.length
  const anomalies = revenues.filter((r) => r.amount > avg * 3)

  const monthlyStr  = monthly.map(([p, v]) => `${p}: ${v.toFixed(0)} €`).join(', ')
  const sourceStr   = bySrc.map(([s, v]) => `${s}: ${v.toFixed(0)} €`).join(', ')
  const artistStr   = byArtist.map(([a, v]) => `${a}: ${v.toFixed(0)} €`).join(', ')
  const anomalyStr  = anomalies.length > 0
    ? anomalies.map((r) => `${r.period} / ${r.source} / ${r.amount.toFixed(0)} €`).join('; ')
    : 'nicio anomalie detectată'

  const prompt = `Ești un analist financiar specializat în industria muzicală. Analizează datele financiare ale unui label și generează un raport structurat în română.
IMPORTANT: Anul curent de referință este 2026! Toate analizele, trendurile și recomandările trebuie să reflecte faptul că suntem în anul 2026 (sau perioade recente din 2026 și sfârșitul lui 2025 ca istoric recent). Nu te referi la 2025 ca fiind viitor sau an curent.

DATE FINANCIARE:
- Total venituri: ${revenues.reduce((s, r) => s + r.amount, 0).toFixed(0)} € (${revenues.length} înregistrări)
- Ultimele 6 luni (lunar): ${monthlyStr}
- Distribuție per sursă: ${sourceStr}
- Top artiști după venituri: ${artistStr}
- Anomalii detectate (sume > 3x medie): ${anomalyStr}

Generează un raport cu EXACT aceste 4 secțiuni (folosește titlurile exact):

**TREND**
2-3 propoziții despre evoluția lunară. Menționează dacă există creștere, scădere sau stagnare.

**SURSE DOMINANTE**
1-2 propoziții despre ce surse aduc cele mai mari venituri și ce oportunități există.

**ANOMALII**
1-2 propoziții. Dacă există anomalii, explică ce înregistrări par atipice. Dacă nu sunt, confirmă că datele par consistente.

**RECOMANDĂRI**
Exact 2 recomandări acționabile, fiecare pe o linie nouă cu prefix "→".`

  let errorMsg: string | null = null
  try {
    const report = await generateText(prompt)
    await prisma.notification.create({
      data: { userId: session.userId, message: report, type: 'AI_FINANCE' },
    })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizata.'
    else throw e
  }

  if (errorMsg) redirect(`/finance?error=${errorMsg}`)
  redirect('/finance')
}

// ── Dashboard: Generează insights AI pentru label ─────────────────────────
export async function generateDashboardInsightsAction() {
  const session = await requireSession()
  if (!session.labelId) redirect('/dashboard')

  const [artistsCount, tracksCount, releasedCount, totalRevenue, expiringContracts, topProspects] =
    await Promise.all([
      prisma.artist.count({ where: { labelId: session.labelId } }),
      prisma.track.count({ where: { labelId: session.labelId } }),
      prisma.track.count({ where: { labelId: session.labelId, status: 'RELEASED' } }),
      prisma.revenue.aggregate({ where: { labelId: session.labelId }, _sum: { amount: true } }),
      prisma.contract.count({ where: { labelId: session.labelId, status: 'EXPIRING' } }),
      prisma.aRProspect.count({ where: { labelId: session.labelId, status: { not: 'REJECTED' } } }),
    ])

  const revenue = totalRevenue._sum.amount ?? 0

  const prompt = `Ești un consultant de business specializat în industria muzicală. Analizează datele unui label muzical și oferă 3 recomandări acționabile.

Date label:
- Artiști: ${artistsCount}
- Piese în catalog: ${tracksCount} (din care lansate: ${releasedCount})
- Venituri totale: ${revenue.toFixed(0)} €
- Contracte care expiră curând: ${expiringContracts}
- Prospecte A&R active: ${topProspects}

Oferă exact 3 recomandări scurte și acționabile în română. Fiecare recomandare pe o linie nouă, începând cu "→".`

  let errorMsg: string | null = null
  try {
    const insight = await generateText(prompt)
    await prisma.notification.create({
      data: { userId: session.userId, message: insight, type: 'AI_INSIGHT' },
    })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizată.'
    else throw e
  }

  if (errorMsg) redirect(`/dashboard?error=${errorMsg}`)
  redirect('/dashboard')
}

