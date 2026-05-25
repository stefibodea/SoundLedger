import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KPICard } from '@/components/ui/KPICard'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Free Trial',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Labels totale" value={totalLabels}    accentColor="blue"   />
        <KPICard label="Active"        value={activeLabels}   accentColor="green"  />
        <KPICard label="Suspendate"    value={suspendedCount} accentColor={suspendedCount > 0 ? 'red' : 'gray'} />
        <KPICard label="Venituri" value={fmtEur(totalRevenue)} accentColor="purple" />
      </div>

      <section className="card">
        <h3 style={{ marginBottom: 16 }}>Case de discuri înregistrate</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Artiști</th>
                <th>Piese</th>
                <th>Echipă</th>
                <th>Venituri</th>
                <th>Status</th>
                <th>Înregistrat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {labels.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nicio casă de discuri înregistrată.</td></tr>
              ) : (
                labels.map((label) => {
                  const planStyle = PLAN_COLORS[label.plan] ?? PLAN_COLORS.FREE_TRIAL
                  const revenue   = revenueMap.get(label.id) ?? 0
                  const isSuspended = Boolean(label.suspendedAt)

                  return (
                    <tr key={label.id} style={{ opacity: isSuspended ? 0.6 : 1 }}>
                      <td>
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
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0 }}>{label.owner.firstName} {label.owner.lastName}</p>
                        <p style={{ margin: 0, fontSize: 11 }}>{label.owner.email}</p>
                      </td>
                      <td>
                        <span style={{ background: planStyle.bg, color: planStyle.color, border: `1px solid ${planStyle.color}33`, fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {PLAN_LABELS[label.plan] ?? label.plan}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{label._count.artists}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{label._count.tracks}</td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{label._count.members}</td>
                      <td style={{ fontSize: 13 }}><strong>{fmtEur(revenue)}</strong></td>
                      <td>
                        {isSuspended ? (
                          <span style={{ background: 'rgba(252,165,165,0.15)', color: '#fca5a5', border: '1px solid rgba(252,165,165,0.3)', fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            Suspendat
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)', fontSize: 11, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            Activ
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(label.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td>
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
