import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { generateComplianceReportAction } from '@/app/actions/compliance'

const DETECTION_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'În analiză',  color: 'var(--role-finance-dark)' },
  CONFIRMED: { label: 'Confirmat',   color: 'var(--role-artist-dark)' },
  DISMISSED: { label: 'Respins',     color: 'var(--text-secondary)' },
  RESOLVED:  { label: 'Rezolvat',    color: 'var(--role-ar-dark)' },
}

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; report?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/dashboard')

  const params = await searchParams
  const error = params.error
  const showReport = params.report === '1'

  const [totalTracks, withPermissions, withCerts, openDetections, recentDetections, lastReport] =
    await Promise.all([
      prisma.track.count({ where: { labelId: session.labelId } }),
      prisma.aIPermission.count({ where: { labelId: session.labelId } }),
      prisma.humanMadeCertificate.count({ where: { labelId: session.labelId, isRevoked: false } }),
      prisma.aIDetection.count({
        where: { labelId: session.labelId, status: { in: ['PENDING', 'CONFIRMED'] } },
      }),
      prisma.aIDetection.findMany({
        where: { labelId: session.labelId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.notification.findFirst({
        where: { userId: session.userId, type: 'AI_COMPLIANCE' },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  const complianceScore = totalTracks === 0
    ? 0
    : Math.round(((withPermissions + withCerts) / (totalTracks * 2)) * 100)

  return (
    <AppShell
      session={session}
      title="🛡️ AI Compliance"
    >
      {showReport && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-ar-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-ar-dark)', margin: 0 }}>✓ Raportul de conformitate a fost generat și salvat în notificări.</p>
        </div>
      )}
      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>⚠️ {decodeURIComponent(error)}</p>
        </div>
      )}

      {/* Scor conformitate */}
      <section className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Scor conformitate AI</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Bazat pe permisiuni setate și certificate emise față de totalul pieselor
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 48,
              fontWeight: 800,
              color: complianceScore >= 70 ? 'var(--role-ar-dark)' : complianceScore >= 40 ? 'var(--role-finance-dark)' : 'var(--role-artist-dark)',
              lineHeight: 1,
            }}>
              {complianceScore}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {complianceScore >= 70 ? 'Conformitate bună' : complianceScore >= 40 ? 'Necesită atenție' : 'Risc ridicat'}
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard
          label="Total piese catalog"
          value={totalTracks}
          accentColor="purple"
        />
        <KPICard
          label="Cu permisiuni AI"
          value={withPermissions}
          accentColor="blue"
          subtitle={totalTracks > 0 ? `${Math.round((withPermissions / totalTracks) * 100)}% din catalog` : undefined}
        />
        <KPICard
          label="Certificate Human Made"
          value={withCerts}
          accentColor="green"
        />
        <KPICard
          label="Detecții deschise"
          value={openDetections}
          accentColor={openDetections > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Acțiuni principale */}
      <section className="grid grid-3" style={{ marginBottom: 20 }}>
        <Link href="/compliance/permissions" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
            <h3 style={{ marginBottom: 4 }}>Permisiuni AI</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Setează ce este permis sau interzis per piesă. Gestionează consimțământul artiștilor.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)' }}>
              {withPermissions}/{totalTracks} piese configurate →
            </div>
          </div>
        </Link>

        <Link href="/compliance/scanner" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <h3 style={{ marginBottom: 4 }}>Scanner piese suspecte</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Raportează și analizează cu AI piese externe care par să fi utilizat muzica ta.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: openDetections > 0 ? 'var(--role-artist-dark)' : 'var(--primary)' }}>
              {openDetections > 0 ? `${openDetections} detecții deschise →` : 'Nicio detecție deschisă →'}
            </div>
          </div>
        </Link>

        <Link href="/compliance/certificates" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <h3 style={{ marginBottom: 4 }}>Certificate Human Made</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Certifică piesele 100% create de oameni, fără implicarea AI-ului.
            </p>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)' }}>
              {withCerts}/{totalTracks} piese certificate →
            </div>
          </div>
        </Link>
      </section>

      {/* Raport AI */}
      {canManageCompliance(session.role) && (
        <section className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>✦ Raport AI de conformitate</h3>
            <form action={generateComplianceReportAction}>
              <button className="btn btn-secondary" type="submit" style={{ fontSize: 13 }}>
                ✦ Generează raport
              </button>
            </form>
          </div>
          {lastReport ? (
            <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: '3px solid var(--primary)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                {lastReport.message}
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Niciun raport generat încă. Apasă butonul de mai sus pentru o analiză AI a stării de conformitate.
            </p>
          )}
        </section>
      )}

      {/* Ultimele detecții */}
      {recentDetections.length > 0 && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Ultimele detecții raportate</h3>
            <Link href="/compliance/scanner" className="btn btn-ghost" style={{ fontSize: 13 }}>
              Vezi toate →
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
    </AppShell>
  )
}
