import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'

const DETECTION_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'În analiză',  color: 'var(--role-finance-dark)' },
  CONFIRMED: { label: 'Confirmat',   color: 'var(--role-artist-dark)' },
  DISMISSED: { label: 'Respins',     color: 'var(--text-secondary)' },
  RESOLVED:  { label: 'Rezolvat',    color: 'var(--role-ar-dark)' },
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/dashboard')

  const params = await searchParams
  const error = params.error

  const [totalTracks, withCerts, withCreativeRecords, openDetections, recentDetections] =
    await Promise.all([
      prisma.track.count({ where: { labelId: session.labelId } }),
      prisma.humanMadeCertificate.count({ where: { labelId: session.labelId, isRevoked: false } }),
      prisma.creativeRecord.count({ where: { labelId: session.labelId } }),
      prisma.aIDetection.count({
        where: { labelId: session.labelId, status: { in: ['PENDING', 'CONFIRMED'] } },
      }),
      prisma.aIDetection.findMany({
        where: { labelId: session.labelId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  return (
    <AppShell session={session} title="AI Compliance">
      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(error)}</p>
        </div>
      )}

      {/* Acțiuni principale */}
      <section className="grid grid-2" style={{ marginBottom: 12 }}>
        <Link href="/compliance/creative" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <h3 style={{ marginBottom: 4 }}>Declarații AI per piesă</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Declară pentru fiecare piesă dacă și unde a fost folosit AI: compoziție, versuri, voce sintetizată, producție.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)' }}>
              {withCreativeRecords}/{totalTracks} piese declarate
            </div>
          </div>
        </Link>

        <Link href="/compliance/creative" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <h3 style={{ marginBottom: 4 }}>Certificate Human Made</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Certificatele sunt emise automat din declarațiile AI pentru piese 100% umane și pot fi folosite în litigii.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)' }}>
              {withCerts}/{totalTracks} piese certificate
            </div>
          </div>
        </Link>
      </section>

      <section style={{ marginBottom: 20 }}>
        <Link href="/compliance/scanner" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s', maxWidth: 480 }}>
            <h3 style={{ marginBottom: 4 }}>Scanner piracy AI</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Raportează și analizează piese externe suspecte care ar putea folosi muzica ta fără drept.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: openDetections > 0 ? 'var(--role-artist-dark)' : 'var(--primary)' }}>
              {openDetections > 0 ? `${openDetections} detecții deschise` : 'Nicio detecție activă'}
            </div>
          </div>
        </Link>
      </section>

      {/* Ultimele detecții */}
      {recentDetections.length > 0 && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Ultimele detecții raportate</h3>
            <Link href="/compliance/scanner" className="btn btn-ghost" style={{ fontSize: 13 }}>
              Vezi toate
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {recentDetections.map((d) => {
              const st = DETECTION_STATUS[d.status] ?? DETECTION_STATUS.PENDING
              return (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{d.suspectArtist ?? 'Artist necunoscut'}</strong>
                    {d.suspectTitle && <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}> — {d.suspectTitle}</span>}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {d.platform ?? 'Platformă necunoscută'} · {new Date(d.createdAt).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {d.similarityScore != null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: d.similarityScore >= 70 ? 'var(--role-artist-dark)' : 'var(--text-secondary)' }}>
                        {d.similarityScore}%
                      </span>
                    )}
                    <span className="badge" style={{ color: st.color, background: 'var(--bg-tertiary)' }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <KpiVinylSidebar kpis={[
        { value: totalTracks,         label: 'Piese',         accentColor: 'purple' },
        { value: withCerts,           label: 'Certificate',   accentColor: 'green' },
        { value: withCreativeRecords, label: 'Declarații AI', accentColor: 'blue' },
        { value: openDetections,      label: 'Detecții',      accentColor: openDetections > 0 ? 'red' : 'gray' },
      ]} />
    </AppShell>
  )
}
