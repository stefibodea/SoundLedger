import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageTeam } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { updateLabelAction } from '@/app/actions/settings'

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function LabelSettingsPage({ searchParams }: PageProps) {
  const session = await requireSession()
  await enforceOnboarding(session, '/settings/label')
  if (!session.labelId || !canManageTeam(session.role)) redirect('/dashboard')

  const sp = await searchParams

  const label = await prisma.label.findUnique({
    where: { id: session.labelId },
    select: { name: true, country: true, city: true, genre: true, logo: true },
  })

  if (!label) redirect('/dashboard')

  return (
    <AppShell session={session} title="Informații label">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Înapoi la dashboard
        </Link>
      </div>

      {sp.success === '1' && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid #4ade80', padding: '12px 16px', background: 'rgba(74,222,128,0.06)' }}>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 500 }}>Informațiile labelului au fost actualizate.</p>
        </div>
      )}
      {sp.error && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--role-artist-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(sp.error)}</p>
        </div>
      )}

      <section className="card" style={{ maxWidth: 600 }}>
        <form action={updateLabelAction} style={{ display: 'grid', gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="s-name">Nume label *</label>
            <input id="s-name" name="name" className="form-input" defaultValue={label.name} required />
          </div>
          <div className="form-row" style={{ margin: 0 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="s-country">Țară *</label>
              <input id="s-country" name="country" className="form-input" defaultValue={label.country} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="s-city">Oraș *</label>
              <input id="s-city" name="city" className="form-input" defaultValue={label.city} required />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="s-genre">Gen muzical principal *</label>
            <input id="s-genre" name="genre" className="form-input" defaultValue={label.genre} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="s-logo">Logo (PNG / SVG / JPG)</label>
            {label.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={label.logo} alt="Logo curent" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, marginBottom: 10, background: 'var(--bg-tertiary)', padding: 6, display: 'block' }} />
            )}
            <input id="s-logo" name="logo" type="file" className="form-input" accept="image/png,image/svg+xml,image/jpeg" style={{ padding: '7px 12px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Salvează modificările</button>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
