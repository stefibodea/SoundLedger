import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageFinance } from '@/lib/roles'
import { updateRevenueAction, deleteRevenueAction } from '@/app/actions/revenues'

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YouTube Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV (CREDIDAM/UCMR-ADA)',
  SYNC_LICENSING:      'Sync Licensing',
  LICENTIERE:          'Licențiere',
  VANZARI_FIZICE:      'Vânzări fizice',
  MERCHANDISE:         'Merchandise',
  ALTE_SURSE:          'Alte surse',
  // legacy
  STREAMING:           'Spotify',
  YOUTUBE:             'YouTube',
  LICENSING:           'Licențiere',
  PHYSICAL:            'Vânzări fizice',
  SYNC:                'Sync',
}

type Props = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditRevenuePage({ params, searchParams }: Props) {
  const session = await requireSession()
  if (!session.labelId || !canManageFinance(session.role)) redirect('/dashboard')

  const { id }    = await params
  const { error } = await searchParams

  const [revenue, artists] = await Promise.all([
    prisma.revenue.findUnique({ where: { id }, include: { artist: true } }),
    prisma.artist.findMany({ where: { labelId: session.labelId }, orderBy: { name: 'asc' } }),
  ])

  if (!revenue || revenue.labelId !== session.labelId) notFound()

  return (
    <AppShell session={session} title="Editează venit">
      <div style={{ marginBottom: 20 }}>
        <Link href="/finance" className="btn btn-secondary">← Înapoi la finanțe</Link>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(error.replace(/\+/g, ' '))}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <section className="card">
          <h3 style={{ marginBottom: 16 }}>Modifică înregistrarea</h3>
          <form action={updateRevenueAction}>
            <input type="hidden" name="id" value={revenue.id} />
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sursă</label>
                <select name="source" className="form-input form-select" defaultValue={revenue.source}>
                  <option value="SPOTIFY">Spotify</option>
                  <option value="APPLE_MUSIC">Apple Music</option>
                  <option value="YOUTUBE_MUSIC">YouTube Music</option>
                  <option value="YOUTUBE_CONTENT_ID">YouTube Content ID</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="DEEZER">Deezer</option>
                  <option value="RADIO_TV">Radio &amp; TV (CREDIDAM/UCMR-ADA)</option>
                  <option value="SYNC_LICENSING">Sync Licensing</option>
                  <option value="LICENTIERE">Licențiere</option>
                  <option value="VANZARI_FIZICE">Vânzări fizice</option>
                  <option value="MERCHANDISE">Merchandise</option>
                  <option value="ALTE_SURSE">Alte surse</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Suma (€)</label>
                <input name="amount" type="number" step="0.01" className="form-input" defaultValue={revenue.amount} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Perioadă</label>
                <input name="period" className="form-input" defaultValue={revenue.period} placeholder="ex: 2026-03" required />
              </div>
              <div className="form-group">
                <label className="form-label">Nr. streamuri (opțional)</label>
                <input name="streams" type="number" min="0" className="form-input" defaultValue={revenue.streams ?? ''} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Artist (opțional)</label>
              <select name="artistId" className="form-input form-select" defaultValue={revenue.artistId ?? ''}>
                <option value="">Fără artist specific</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descriere / note contabile (opțional)</label>
              <textarea name="description" className="form-input form-textarea" rows={3} defaultValue={revenue.description ?? ''} />
            </div>
            <button className="btn btn-primary" type="submit">Salvează modificările</button>
          </form>
        </section>

        <section className="card">
          <h4 style={{ marginBottom: 12, color: 'var(--status-expired)' }}>Zonă periculoasă</h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Ștergerea este permanentă și nu poate fi anulată.
          </p>
          <form action={deleteRevenueAction} onSubmit={undefined}>
            <input type="hidden" name="id" value={revenue.id} />
            <button
              className="btn btn-secondary"
              type="submit"
              style={{ color: 'var(--status-expired)', borderColor: 'var(--status-expired)' }}
            >
              Șterge înregistrarea
            </button>
          </form>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Adăugat: {new Date(revenue.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
