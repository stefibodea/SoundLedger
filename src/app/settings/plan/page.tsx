import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Trial gratuit',
  INDIE:      'Indie',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}

const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: 'var(--text-secondary)',
  INDIE:      '#60a5fa',
  PRO:        '#9B94F0',
  ENTERPRISE: '#fde68a',
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  FREE_TRIAL: 'Ești pe planul trial. Upgrade pentru funcții avansate.',
  INDIE:      'Plan Indie — acces la funcțiile de bază ale platformei.',
  PRO:        'Plan Pro — acces complet la toate modulele.',
  ENTERPRISE: 'Plan Enterprise — acces nelimitat + suport dedicat.',
}

const PLAN_FEATURES: Record<string, string[]> = {
  FREE_TRIAL: ['Până la 10 artiști', 'Până la 50 piese', 'Rapoarte de bază', 'AI Compliance (limitat)'],
  INDIE:      ['Până la 25 artiști', 'Piese nelimitate', 'Export CSV', 'AI Compliance complet', 'Scanner piracy'],
  PRO:        ['Artiști nelimitați', 'Piese nelimitate', 'Toate rapoartele', 'AI Compliance + Certificate', 'Scanner piracy avansat', 'Scouting A&R AI'],
  ENTERPRISE: ['Tot din Pro', 'SLA garantat', 'Suport dedicat', 'Integrări custom', 'Multi-label management'],
}

export default async function PlanSettingsPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/settings/plan')
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const label = await prisma.label.findUnique({
    where: { id: session.labelId },
    select: { plan: true, planExpiry: true },
  })

  if (!label) redirect('/dashboard')

  const color    = PLAN_COLORS[label.plan]       ?? 'var(--text-primary)'
  const features = PLAN_FEATURES[label.plan]     ?? []
  const desc     = PLAN_DESCRIPTIONS[label.plan] ?? ''

  return (
    <AppShell session={session} title="Plan abonament">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Înapoi la dashboard
        </Link>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Plan curent */}
        <section className="card">
          <h3 style={{ marginBottom: 20 }}>Plan curent</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              padding: '8px 22px', borderRadius: 20, fontSize: 16, fontWeight: 700,
              background: 'rgba(155,148,240,0.08)',
              color,
              border: `1px solid ${color}40`,
            }}>
              {PLAN_LABELS[label.plan] ?? label.plan}
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>{desc}</p>

          {label.planExpiry && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Expiră:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {new Date(label.planExpiry).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </strong>
            </div>
          )}

          <h4 style={{ fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Ce include planul tău
          </h4>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {features.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Upgrade */}
        {label.plan !== 'ENTERPRISE' && (
          <section className="card" style={{ background: 'rgba(155,148,240,0.04)', border: '1px solid rgba(155,148,240,0.15)' }}>
            <h3 style={{ marginBottom: 8 }}>Upgrade plan</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Contactează echipa SoundLedger pentru a upgradat planul sau pentru o ofertă personalizată.
            </p>
            <a
              href="mailto:contact@soundledger.ro"
              className="btn btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Contactează-ne
            </a>
          </section>
        )}
      </div>
    </AppShell>
  )
}
