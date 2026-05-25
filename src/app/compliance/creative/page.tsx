import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { CreativeClient } from './creative-client'

export default async function CreativePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; track?: string; error?: string; cert?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/creative')
  if (!session.labelId || !canManageCompliance(session.role)) redirect('/compliance')

  const params = await searchParams

  const [tracks, records, composerList] = await Promise.all([
    prisma.track.findMany({
      where: { labelId: session.labelId },
      include: { artist: { select: { name: true } }, creativeRecord: true, humanMadeCert: true },
      orderBy: [{ artist: { name: 'asc' } }, { title: 'asc' }],
    }),
    prisma.creativeRecord.count({ where: { labelId: session.labelId } }),
    prisma.composer.findMany({
      where: { labelId: session.labelId },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalTracks = tracks.length
  const withRecord = records
  const withoutRecord = totalTracks - withRecord

  const withCert = tracks.filter((t) => t.humanMadeCert && !t.humanMadeCert.isRevoked).length

  const trackRows = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artistName: t.artist.name,
    type: t.type,
    creativeRecord: t.creativeRecord
      ? {
          aiCompozitie: t.creativeRecord.aiCompozitie,
          aiVersuri:    t.creativeRecord.aiVersuri,
          aiVoce:       t.creativeRecord.aiVoce,
          aiProductie:  t.creativeRecord.aiProductie,
          aiAltele:     t.creativeRecord.aiAltele,
          composers:    t.creativeRecord.composers,
          producers:    t.creativeRecord.producers,
          daw:          t.creativeRecord.daw,
          sessionDate:  t.creativeRecord.sessionDate,
          studio:       t.creativeRecord.studio,
          instruments:  t.creativeRecord.instruments,
          statement:    t.creativeRecord.statement,
          updatedAt:    t.creativeRecord.updatedAt.toISOString(),
        }
      : null,
    cert: t.humanMadeCert && !t.humanMadeCert.isRevoked
      ? {
          id: t.humanMadeCert.id,
          certificateCode: t.humanMadeCert.certificateCode,
          issuedAt: t.humanMadeCert.issuedAt.toISOString(),
        }
      : null,
  }))

  return (
    <AppShell session={session} title="Declarații AI per piesă">

      <div style={{ marginBottom: 16 }}>
        <Link href="/compliance" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Înapoi la Compliance
        </Link>
      </div>

      {params.success === '1' && params.track && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #4ade80', padding: '12px 16px', background: 'rgba(74,222,128,0.06)' }}>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 500 }}>
            Dosarul creativ pentru <strong>{decodeURIComponent(params.track)}</strong> a fost salvat.
            {params.cert === '1' && ' Certificatul Human Made a fost emis automat.'}
          </p>
        </div>
      )}
      {params.error && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-artist-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(params.error)}</p>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Declară pentru fiecare piesă dacă și unde a fost folosit AI în procesul de creație.
          Piesele fără implicare AI sunt eligibile pentru Certificat Human Made cu forță juridică în UE.
        </p>
      </div>

      <CreativeClient
    tracks={trackRows}
    composers={composerList.map((c) => ({ id: c.id, name: c.name }))}
    canManage={canManageCompliance(session.role)}
  />

      <KpiVinylSidebar kpis={[
        { value: totalTracks,   label: 'Piese total',    accentColor: 'purple' },
        { value: withRecord,    label: 'Declarate',      accentColor: 'blue' },
        { value: withCert,      label: 'Certificate HM', accentColor: 'green' },
        { value: withoutRecord, label: 'Nedeclarate',    accentColor: withoutRecord > 0 ? 'yellow' : 'gray' },
      ]} />
    </AppShell>
  )
}
