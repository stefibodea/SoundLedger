'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { generateText } from '@/lib/ai'
import { ROLES } from '@/lib/roles'
import { requireOwnArtistProfile, assertContractBelongsToOwnArtist } from '@/lib/tenant-security'

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

// ── Lansări: Generează comunicat de presă ─────────────────────────────────
export async function generatePressReleaseAction(formData: FormData) {
  const session = await requireSession()
  const releaseId = formData.get('releaseId') as string

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { track: { include: { artist: true } }, album: { include: { artist: true } } },
  })
  if (!release || release.labelId !== session.labelId) redirect('/releases')

  const trackName = release.track
    ? `${release.track.title} de ${release.track.artist.name}`
    : release.album
    ? `albumul ${release.album.title} de ${release.album.artist.name}`
    : 'lansare muzicală'

  const genre = release.track?.genre ?? release.album?.artist?.genre ?? ''

  const prompt = `Ești un specialist în PR muzical. Scrie un comunicat de presă profesional în română pentru următoarea lansare:

Lansare: ${trackName}
Data lansării: ${release.releaseDate}
${genre ? `Gen muzical: ${genre}` : ''}
${release.track?.isrc ? `ISRC: ${release.track.isrc}` : ''}

Comunicatul trebuie să includă:
- Un titlu captivant
- 2-3 paragrafe despre lansare și artist
- Un citat inventat dar plauzibil din partea artistului
- O frază de încheiere

Scrie în stil jurnalistic, profesional, în română.`

  let errorMsg: string | null = null
  try {
    const pressRelease = await generateText(prompt)
    await prisma.release.update({ where: { id: releaseId }, data: { pressRelease } })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizată.'
    else throw e
  }

  if (errorMsg) redirect(`/releases?error=${errorMsg}`)
  redirect('/releases')
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

// ── Artist: Generează biografie AI ────────────────────────────────────────
export async function generateArtistBioAction() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/my-profile')

  const artist = await requireOwnArtistProfile(session, '/my-profile')

  const tracks = await prisma.track.findMany({
    where: { artistId: artist.id, status: 'RELEASED' },
    select: { title: true, genre: true },
    take: 6,
  })

  const revenues = await prisma.revenue.findMany({
    where: { artistId: artist.id },
    select: { amount: true, source: true },
  })
  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0)
  const topSource = revenues.length > 0
    ? Object.entries(revenues.reduce<Record<string, number>>((acc, r) => {
        acc[r.source] = (acc[r.source] ?? 0) + r.amount; return acc
      }, {})).sort(([, a], [, b]) => b - a)[0]?.[0]
    : null

  const sourceLabel: Record<string, string> = {
    SPOTIFY: 'Spotify', APPLE_MUSIC: 'Apple Music', YOUTUBE_MUSIC: 'YouTube Music',
    YOUTUBE_CONTENT_ID: 'YouTube Content ID', TIKTOK: 'TikTok', DEEZER: 'Deezer',
    RADIO_TV: 'Radio & TV', SYNC_LICENSING: 'Sync Licensing', LICENTIERE: 'licențiere',
    VANZARI_FIZICE: 'vânzări fizice', MERCHANDISE: 'merchandise', ALTE_SURSE: 'alte surse',
    // legacy
    STREAMING: 'streaming', YOUTUBE: 'YouTube', LICENSING: 'licențiere', SYNC: 'sync', PHYSICAL: 'vânzări fizice',
  }

  const prompt = `Ești un specialist în PR muzical. Scrie o biografie artistică profesională și captivantă în română pentru următorul artist.

Artist: ${artist.name}
Gen muzical: ${artist.genre}${artist.subgenre ? ` / ${artist.subgenre}` : ''}
${artist.nationality ? `Naționalitate: ${artist.nationality}` : ''}
${tracks.length > 0 ? `Piese lansate: ${tracks.map((t) => t.title).join(', ')}` : ''}
${totalRevenue > 0 ? `Venituri generate: ${totalRevenue.toFixed(0)} €${topSource ? ` (majoritar din ${sourceLabel[topSource] ?? topSource})` : ''}` : ''}
${artist.spotifyUrl ? 'Prezență pe Spotify' : ''}${artist.instagram ? `, Instagram: ${artist.instagram}` : ''}

Scrie o biografie de 3-4 propoziții, în română, la persoana a treia. Tonul să fie profesional dar accesibil, potrivit pentru un press kit sau pagină de artist. Nu inventa fapte concrete (nu da cifre de streamuri sau premii), dar poți evoca stilul, atmosfera și impactul muzicii.`

  let errorMsg: string | null = null
  try {
    const bio = await generateText(prompt)
    await prisma.artist.update({ where: { id: artist.id }, data: { bio } })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizata.'
    else throw e
  }

  if (errorMsg) redirect(`/my-profile?error=${errorMsg}`)
  redirect('/my-profile?success=Biografia+a+fost+generata+cu+succes')
}

// ── Artist: Generează career insights ─────────────────────────────────────
export async function generateArtistInsightsAction() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/my-music')

  const artist = await requireOwnArtistProfile(session, '/my-music')

  const [tracks, revenues, contract] = await Promise.all([
    prisma.track.findMany({
      where: { artistId: artist.id },
      include: { revenues: true },
    }),
    prisma.revenue.findMany({
      where: { artistId: artist.id },
      orderBy: { period: 'asc' },
    }),
    prisma.contract.findFirst({
      where: { artistId: artist.id, status: { in: ['ACTIVE', 'EXPIRING'] } },
      select: { royaltyPercent: true, endDate: true, status: true },
    }),
  ])

  const released    = tracks.filter((t) => t.status === 'RELEASED').length
  const totalRev    = revenues.reduce((s, r) => s + r.amount, 0)
  const sourceMap   = revenues.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + r.amount; return acc
  }, {})
  const topSource   = Object.entries(sourceMap).sort(([, a], [, b]) => b - a)[0]
  const topTrack    = tracks.sort((a, b) =>
    b.revenues.reduce((s, r) => s + r.amount, 0) - a.revenues.reduce((s, r) => s + r.amount, 0)
  )[0]

  const monthlyMap  = revenues.reduce<Record<string, number>>((acc, r) => {
    acc[r.period] = (acc[r.period] ?? 0) + r.amount; return acc
  }, {})
  const lastMonths  = Object.entries(monthlyMap).sort(([a], [b]) => b.localeCompare(a)).slice(0, 3)
  const trend       = lastMonths.length >= 2
    ? lastMonths[0][1] > lastMonths[1][1] ? 'în creștere' : 'în scădere'
    : 'stabil'

  const prompt = `Ești un consultant de carieră specializat în industria muzicală. Analizează datele unui artist și oferă 3 recomandări acționabile personalizate.

Date artist:
- Nume: ${artist.name}
- Gen: ${artist.genre}${artist.subgenre ? ` / ${artist.subgenre}` : ''}
- Piese în catalog: ${tracks.length} (din care lansate: ${released})
- Piesa cu cele mai mari venituri: ${topTrack?.title ?? '—'}
- Venituri totale: ${totalRev.toFixed(0)} €
- Sursa principală de venituri: ${topSource ? `${topSource[0]} (${topSource[1].toFixed(0)} €)` : '—'}
- Trend venituri recente: ${trend}
${contract ? `- Contract activ: royalty ${contract.royaltyPercent}%, expiră ${contract.endDate ?? '?'}${contract.status === 'EXPIRING' ? ' (EXPIRĂ CURÂND!)' : ''}` : '- Fără contract activ'}
${artist.spotifyUrl ? '- Prezent pe Spotify' : '- Lipsă Spotify'}
${artist.instagram ? `- Instagram: ${artist.instagram}` : '- Lipsă Instagram'}

Oferă exact 3 recomandări scurte, acționabile și personalizate pentru acest artist, în română. Fiecare recomandare pe o linie nouă cu prefix "→". Ține cont de datele reale — dacă lipsește ceva important (Spotify, Instagram, contractul expiră), menționează asta.`

  let errorMsg: string | null = null
  try {
    const insight = await generateText(prompt)
    await prisma.notification.create({
      data: { userId: session.userId, message: insight, type: 'AI_INSIGHT' },
    })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizata.'
    else throw e
  }

  if (errorMsg) redirect(`/my-music?error=${errorMsg}`)
  redirect('/my-music')
}

// ── Artist: Explică contractul în limbaj simplu ────────────────────────────
export async function generateArtistContractExplanationAction(formData: FormData) {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/my-contract')

  const contractId = formData.get('contractId') as string
  const artist     = await requireOwnArtistProfile(session, '/my-contract')

  await assertContractBelongsToOwnArtist(contractId, artist.id, '/my-contract')
  const contract = await prisma.contract.findUnique({ where: { id: contractId } })
  if (!contract) redirect('/my-contract')

  const today     = new Date()
  const endDate   = contract.endDate ? new Date(contract.endDate) : null
  const daysLeft  = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

  const prompt = `Ești un avocat specializat în industria muzicală care explică contracte artiștilor în termeni simpli și prietenosi.

Explică următorul contract unui artist, din perspectiva lui, în română. Fii sincer și direct — menționează atât aspectele pozitive cât și riscurile sau clauzele care merită atenție.

Detalii contract:
- Royalty: ${contract.royaltyPercent}% (artistul primește ${contract.royaltyPercent}% din veniturile generate)
- Durată: ${contract.duration}
- Avans: ${contract.advance ? `${contract.advance} €` : 'Fără avans'}
- Perioadă: ${contract.startDate ?? '?'} → ${contract.endDate ?? '?'}
${daysLeft !== null ? `- Zile rămase: ${daysLeft} zile` : ''}
- Status: ${contract.status}
${contract.territories ? `- Teritorii: ${contract.territories}` : ''}
${contract.rights ? `- Drepturi cedate: ${contract.rights}` : ''}
${contract.specialClauses ? `- Clauze speciale: ${contract.specialClauses}` : ''}

Structurează răspunsul cu EXACT aceste 3 secțiuni (folosește titlurile exact):

**CE ÎNSEAMNĂ PENTRU TINE**
2-3 propoziții despre ce primești și ce cedezi prin acest contract.

**ATENȚIE**
1-2 propoziții despre clauze, termene sau condiții care merită atenție sau negociere.

**SFAT**
O singură propoziție — cel mai important lucru pe care artistul ar trebui să îl facă sau să îl știe.`

  let errorMsg: string | null = null
  try {
    const explanation = await generateText(prompt)
    await prisma.notification.create({
      data: { userId: session.userId, message: explanation, type: 'AI_CONTRACT' },
    })
  } catch (e) {
    if (isQuotaError(e)) errorMsg = 'AI+temporar+indisponibil.+Cota+API+epuizata.'
    else throw e
  }

  if (errorMsg) redirect(`/my-contract?error=${errorMsg}`)
  redirect('/my-contract')
}
