import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { KpiVinylSidebar } from '@/components/kpi-vinyl-sidebar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { unsuspendLabelAction } from '@/app/actions/admin'
import { SuspendLabelSection } from './SuspendLabelSection'
import { DeleteLabelSection } from './DeleteLabelSection'

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Gratuit',
  INDIE:      'Indie',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}

const ROLE_LABELS: Record<string, string> = {
  LABEL_MANAGER: 'Director General',
  FINANCIAL:     'Manager Financiar',
}

type Props = {
  params:       Promise<{ labelId: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function AdminLabelPage({ params, searchParams }: Props) {
  const session = await requireSession()
  if (session.role !== ROLES.SUPER_ADMIN) redirect('/dashboard')

  const { labelId } = await params
  const { error, success } = await searchParams

  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: {
      owner:   { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } },
      members: { select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true } },
      _count:  { select: { artists: true, tracks: true, contracts: true, revenues: true, releases: true } },
    },
  })

  if (!label) notFound()

  const [revenueAgg, royaltyAgg] = await Promise.all([
    prisma.revenue.aggregate({ where: { labelId }, _sum: { amount: true }, _count: true }),
    prisma.royaltyPayment.aggregate({ where: { labelId, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
  ])

  const totalRevenue  = revenueAgg._sum.amount ?? 0
  const pendingRoyal  = royaltyAgg._sum.amount ?? 0
  const isSuspended   = Boolean(label.suspendedAt)

  const fmtEur = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`

  return (
    <AppShell session={session} title={label.name} subtitle="Detalii casă de discuri">
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin" className="btn btn-secondary" style={{ fontSize: 13 }}>Înapoi la toate labels</Link>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-artist-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(error.replace(/\+/g, ' '))}</p>
        </div>
      )}

      {success && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-ar-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-ar-dark)', margin: 0 }}>Modificare salvată cu succes.</p>
        </div>
      )}

      {isSuspended && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid #fca5a5', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#fca5a5', margin: '0 0 4px', fontWeight: 600 }}>Casă de discuri suspendată</p>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13 }}>
              Suspendată la: {new Date(label.suspendedAt!).toLocaleString('ro-RO')}
            </p>
          </div>
          <form action={unsuspendLabelAction}>
            <input type="hidden" name="labelId" value={label.id} />
            <button type="submit" className="btn btn-secondary" style={{ color: '#6ee7b7', borderColor: '#6ee7b7', fontSize: 13 }}>
              Reactivează
            </button>
          </form>
        </div>
      )}

      <KpiVinylSidebar kpis={[
        { value: label._count.artists, label: 'Artiști',   accentColor: 'blue' },
        { value: label._count.tracks,  label: 'Piese',     accentColor: 'purple' },
        { value: fmtEur(totalRevenue), label: 'Venituri',  accentColor: 'green' },
        { value: fmtEur(pendingRoyal), label: 'Royalties', accentColor: royaltyAgg._count > 0 ? 'yellow' : 'gray', sublabel: 'în așteptare' },
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Detalii principale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info label */}
          <section className="card">
            <h3 style={{ marginBottom: 16 }}>Informații label</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Denumire',  value: label.name },
                { label: 'Gen muzical', value: label.genre },
                { label: 'Oraș',      value: label.city },
                { label: 'Țară',      value: label.country },
                { label: 'Înregistrat', value: new Date(label.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Plan curent', value: PLAN_LABELS[label.plan] ?? label.plan },
              ].map(({ label: l, value }) => (
                <div key={l}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Membrii echipei */}
          <section className="card">
            <h3 style={{ marginBottom: 12 }}>Echipă ({label.members.filter((m) => m.id !== label.owner.id).length + 1} membri)</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nume</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Adăugat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: 'rgba(155,148,240,0.05)' }}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{label.owner.firstName} {label.owner.lastName} <span style={{ fontSize: 11, color: 'var(--primary)' }}>(Owner)</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label.owner.email}</td>
                    <td><span style={{ fontSize: 11, color: 'var(--primary)' }}>Director General</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(label.owner.createdAt).toLocaleDateString('ro-RO')}</td>
                  </tr>
                  {label.members.filter((m) => m.id !== label.owner.id).map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 13 }}>{m.firstName} {m.lastName}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.email}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ROLE_LABELS[m.role] ?? m.role}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(m.createdAt).toLocaleDateString('ro-RO')}</td>
                    </tr>
                  ))}
                  {label.members.length === 0 && (
                    <tr><td colSpan={4} style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Niciun alt membru în echipă.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Acțiuni admin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Suspendare */}
          {!isSuspended && (
            <section className="card">
              <h4 style={{ marginBottom: 8, color: '#fde68a' }}>Suspendare</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Utilizatorii labelului nu vor mai putea accesa aplicația.
              </p>
              <SuspendLabelSection labelId={label.id} labelName={label.name} />
            </section>
          )}

          {/* Ștergere */}
          <section className="card">
            <h4 style={{ marginBottom: 8, color: 'var(--role-artist-dark)' }}>Zonă periculoasă</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Șterge complet labelul, toți artiștii, piesele, contractele și veniturile. Ireversibil.
            </p>
            <DeleteLabelSection labelId={label.id} labelName={label.name} />
          </section>
        </div>
      </div>
    </AppShell>
  )
}
