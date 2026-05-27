import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Gratuit',
  INDIE:      'Indie',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  FREE_TRIAL: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' },
  INDIE:      { bg: 'rgba(147,197,253,0.15)', color: '#93c5fd' },
  PRO:        { bg: 'rgba(155,148,240,0.15)', color: '#9b94f0' },
  ENTERPRISE: { bg: 'rgba(110,231,183,0.15)', color: '#6ee7b7' },
}

export default async function AdminPage() {
  const session = await requireSession()
  if (session.role !== ROLES.SUPER_ADMIN) redirect('/dashboard')

  const labels = await prisma.label.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { email: true, firstName: true, lastName: true } },
      _count: {
        select: {
          artists: true,
          tracks:  true,
          members: true,
        },
      },
    },
  })

  // Venituri totale per label
  const revenueAgg = await prisma.revenue.groupBy({
    by: ['labelId'],
    _sum: { amount: true },
  })
  const revenueMap = new Map(revenueAgg.map((r) => [r.labelId, r._sum.amount ?? 0]))

  const totalLabels    = labels.length
  const activeLabels   = labels.filter((l) => !l.suspendedAt).length
  const suspendedCount = labels.filter((l) =>  l.suspendedAt).length
  const totalRevenue   = revenueAgg.reduce((s, r) => s + (r._sum.amount ?? 0), 0)

  const fmtEur = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`

  return (
    <AppShell session={session} title="Platformă Admin" subtitle="Gestionare case de discuri înregistrate">
      <KpiVinylSidebar kpis={[
        { value: totalLabels,          label: 'Labels totale', accentColor: 'blue' },
        { value: activeLabels,         label: 'Active',        accentColor: 'green' },
        { value: suspendedCount,       label: 'Suspendate',    accentColor: suspendedCount > 0 ? 'red' : 'gray' },
        { value: fmtEur(totalRevenue), label: 'Venituri',      accentColor: 'purple' },
      ]} />

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: 0 }}>Case de discuri înregistrate</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Label', 'Owner', 'Plan', 'Artiști', 'Piese', 'Echipă', 'Venituri', 'Status', 'Înregistrat', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nicio casă de discuri înregistrată.</td></tr>
              ) : (
                labels.map((label) => {
                  const planStyle = PLAN_COLORS[label.plan] ?? PLAN_COLORS.FREE_TRIAL
                  const revenue   = revenueMap.get(label.id) ?? 0
                  const isSuspended = Boolean(label.suspendedAt)
                  const td = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' as const }

                  return (
                    <tr key={label.id} style={{ opacity: isSuspended ? 0.6 : 1 }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {label.logo ? (
                            <img src={label.logo} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                              {label.name[0]}
                            </div>
                          )}
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{label.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{label.city}, {label.country}</p>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{label.owner.firstName} {label.owner.lastName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{label.owner.email}</p>
                      </td>
                      <td style={td}>
                        <span style={{ background: planStyle.bg, color: planStyle.color, border: `1px solid ${planStyle.color}33`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {PLAN_LABELS[label.plan] ?? label.plan}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 13 }}>{label._count.artists}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 13 }}>{label._count.tracks}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 13 }}>{label._count.members}</td>
                      <td style={td}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7' }}>{fmtEur(revenue)}</span>
                      </td>
                      <td style={td}>
                        {isSuspended ? (
                          <span style={{ background: 'rgba(252,165,165,0.12)', color: '#fca5a5', border: '1px solid rgba(252,165,165,0.3)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            Suspendat
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(110,231,183,0.12)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            Activ
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(label.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td style={td}>
                        <Link href={`/admin/${label.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}>
                          Gestionează
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
