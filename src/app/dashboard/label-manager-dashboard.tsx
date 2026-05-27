import Link from 'next/link'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { AppShell } from '@/components/app-shell'
import { getNotificationsForLabel } from '@/lib/notifications'
import { generateDashboardInsightsAction } from '@/app/actions/ai'

export async function LabelManagerDashboard({ session }: { session: SessionPayload }) {
  if (!session.labelId) {
    return (
      <AppShell session={session} title="Acasă">
        <div className="card empty-state">
          <p>Contul tău nu este asociat unui label. Contactează administratorul.</p>
        </div>
      </AppShell>
    )
  }

  const labelId = session.labelId

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true },
  })

  const [
    artistsCount,
    tracksCount,
    releasesCount,
    prospectsCount,
    certifiedCount,
    pendingDetectionsCount,
    aiPermissionsCount,
    lastInsight,
    liveNotifications,
  ] = await Promise.all([
    prisma.artist.count({ where: { labelId } }),
    prisma.track.count({ where: { labelId } }),
    prisma.release.count({ where: { labelId, status: { not: 'RELEASED' } } }),
    prisma.aRProspect.count({ where: { labelId, status: { not: 'REJECTED' } } }),
    prisma.humanMadeCertificate.count({ where: { labelId, isRevoked: false } }),
    prisma.aIDetection.count({ where: { labelId, status: 'PENDING' } }),
    prisma.aIPermission.count({ where: { labelId } }),
    prisma.notification.findFirst({
      where: { userId: session.userId, type: 'AI_INSIGHT' },
      orderBy: { createdAt: 'desc' },
    }),
    getNotificationsForLabel(labelId),
  ])

  const tracksWithoutPerms = Math.max(0, tracksCount - aiPermissionsCount)

  const greeting = currentUser?.firstName ? `Bună, ${currentUser.firstName}` : 'Acasă'

  return (
    <AppShell session={session} title={greeting} >

      {/* ── Notificări ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Notificări</h3>
          </div>

          {liveNotifications.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
                Totul este în regulă.<br />Nicio acțiune necesară.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {liveNotifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, margin: '0 0 4px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {n.text}
                    </p>
                    <Link href={n.href} style={{ fontSize: 11, color: n.color, textDecoration: 'none', fontWeight: 600 }}>
                      {n.linkText}
                    </Link>
                  </div>
                </div>
              ))}
              {liveNotifications.length > 6 && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
                  +{liveNotifications.length - 6} altele
                </p>
              )}
            </div>
          )}
        </div>
      </div>


      {/* ── Insights AI ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Insights AI</h3>
          <form action={generateDashboardInsightsAction}>
            <button className="btn btn-sm btn-secondary" type="submit">
              Generează insights noi
            </button>
          </form>
        </div>
        {lastInsight ? (
          <pre style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {lastInsight.message}
          </pre>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: 0 }}>
            Apasă butonul pentru a genera recomandări personalizate pentru label-ul tău.
          </p>
        )}
      </div>

      <KpiVinylSidebar kpis={[
        { value: artistsCount,        label: 'Artiști',         accentColor: 'purple' },
        { value: tracksCount,         label: 'Piese',           accentColor: 'green' },
        { value: releasesCount,       label: 'Lansări active',  accentColor: releasesCount > 0 ? 'blue' : 'gray' },
        { value: certifiedCount,      label: 'Certificate',     accentColor: certifiedCount > 0 ? 'yellow' : 'gray',
          sublabel: pendingDetectionsCount > 0 ? `${pendingDetectionsCount} detecți${pendingDetectionsCount > 1 ? 'i' : 'e'}` : undefined },
      ]} />

    </AppShell>
  )
}
