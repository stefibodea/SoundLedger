import Link from 'next/link'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { AppShell } from '@/components/app-shell'
import { canViewCompliance } from '@/lib/roles'
import { getNotificationsForLabel } from '@/lib/notifications'
import { generateDashboardInsightsAction } from '@/app/actions/ai'
import { RevenueChart, type ChartPoint } from './revenue-chart'

function getLast6Months(): string[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ian', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mai', '06': 'Iun', '07': 'Iul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

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
  const periods = getLast6Months()

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true },
  })

  const [
    artistsCount,
    tracksCount,
    contractsActiveCount,
    revenueAgg,
    releasesCount,
    prospectsCount,
    certifiedCount,
    pendingDetectionsCount,
    aiPermissionsCount,
    revenueByPeriod,
    lastInsight,
    liveNotifications,
  ] = await Promise.all([
    prisma.artist.count({ where: { labelId } }),
    prisma.track.count({ where: { labelId } }),
    prisma.contract.count({ where: { labelId, status: { in: ['ACTIVE', 'EXPIRING'] } } }),
    prisma.revenue.aggregate({ where: { labelId }, _sum: { amount: true } }),
    prisma.release.count({ where: { labelId, status: { not: 'RELEASED' } } }),
    prisma.aRProspect.count({ where: { labelId, status: { not: 'REJECTED' } } }),
    prisma.humanMadeCertificate.count({ where: { labelId, isRevoked: false } }),
    prisma.aIDetection.count({ where: { labelId, status: 'PENDING' } }),
    prisma.aIPermission.count({ where: { labelId } }),
    prisma.revenue.groupBy({
      by: ['period'],
      where: { labelId, period: { in: periods } },
      _sum: { amount: true },
      orderBy: { period: 'asc' },
    }),
    prisma.notification.findFirst({
      where: { userId: session.userId, type: 'AI_INSIGHT' },
      orderBy: { createdAt: 'desc' },
    }),
    getNotificationsForLabel(labelId),
  ])

  const revenueTotal = revenueAgg._sum.amount ?? 0
  const tracksWithoutPerms = Math.max(0, tracksCount - aiPermissionsCount)

  const chartData: ChartPoint[] = periods.map((p) => {
    const found = revenueByPeriod.find((r) => r.period === p)
    const [, month] = p.split('-')
    return { month: MONTH_LABELS[month] ?? month, amount: found?._sum.amount ?? 0 }
  })

  const greeting = currentUser?.firstName ? `Bună, ${currentUser.firstName}` : 'Acasă'

  return (
    <AppShell session={session} title={greeting} >

      {/* ── Rândul 2: Grafic + Notificări ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📊 Evoluția veniturilor</h3>
            <Link href="/finance" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Detalii →
            </Link>
          </div>
          <RevenueChart data={chartData} />
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>
              🔔 Notificări
              {liveNotifications.filter((n) => n.priority === 'alert').length > 0 && (
                <span className="badge" style={{
                  marginLeft: 8, fontSize: 11,
                  background: 'var(--role-artist-light)', color: 'var(--role-artist-dark)',
                }}>
                  {liveNotifications.filter((n) => n.priority === 'alert').length}
                </span>
              )}
            </h3>
          </div>

          {liveNotifications.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
                ✓ Totul este în regulă.<br />Nicio acțiune necesară.
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

      {/* ── Widget AI Compliance detaliat ── */}
      {canViewCompliance(session.role) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>AI Compliance Status</h3>
            <Link href="/compliance" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Vezi detaliile →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>{certifiedCount}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Certificate Human Made</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: tracksWithoutPerms > 0 ? 'var(--role-finance-dark)' : 'var(--text-secondary)' }}>
                  {tracksWithoutPerms}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Fără permisiuni AI</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: pendingDetectionsCount > 0 ? 'var(--role-artist-dark)' : 'var(--text-secondary)' }}>
                  {pendingDetectionsCount}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Detecții active</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Insights AI ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>✦ Insights AI</h3>
          <form action={generateDashboardInsightsAction}>
            <button className="btn btn-sm btn-secondary" type="submit">
              ✦ Generează insights noi
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

      <KpiVinylSidebar compact kpis={[
        { value: artistsCount,        label: 'Artiști',    accentColor: 'purple' },
        { value: tracksCount,         label: 'Piese',      accentColor: 'green' },
        { value: revenueTotal >= 1000 ? `${(revenueTotal / 1000).toFixed(1)}k €` : `${revenueTotal.toFixed(0)} €`, label: 'Venituri', accentColor: 'yellow' },
        { value: contractsActiveCount, label: 'Contracte', accentColor: 'blue' },
        ...(canViewCompliance(session.role) ? [{
          value: certifiedCount,
          label: 'Certificate',
          accentColor: 'red' as const,
          sublabel: pendingDetectionsCount > 0 ? `⚠ ${pendingDetectionsCount} detecți${pendingDetectionsCount > 1 ? 'i' : 'e'}` : undefined,
        }] : []),
      ]} />

    </AppShell>
  )
}
