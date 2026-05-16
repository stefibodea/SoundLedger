import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { getArtistProfile } from '@/lib/artist-profile'
import { ArtistRevenueChart } from '@/components/artist-revenue-chart'

const SOURCE_LABELS: Record<string, string> = {
  STREAMING:   'Streaming',
  LICENSING:   'Licențiere',
  PHYSICAL:    'Vânzări fizice',
  SYNC:        'Sync',
  YOUTUBE:     'YouTube',
  APPLE_MUSIC: 'Apple Music',
}

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  STREAMING:   { bg: 'var(--role-ar-light)',      color: 'var(--role-ar-dark)' },
  LICENSING:   { bg: 'var(--role-label-light)',    color: 'var(--role-label-dark)' },
  PHYSICAL:    { bg: 'var(--role-finance-light)',  color: 'var(--role-finance-dark)' },
  SYNC:        { bg: 'var(--role-artist-light)',   color: 'var(--role-artist-dark)' },
  YOUTUBE:     { bg: '#1a0f00',                    color: '#fdba74' },
  APPLE_MUSIC: { bg: '#1a0a1a',                    color: '#e879f9' },
}

export default async function MyRevenuesPage() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/dashboard')

  const artist = await getArtistProfile(session)

  if (!artist) {
    return (
      <AppShell session={session} title="Veniturile mele">
        <div className="card empty-state">
          <div className="empty-icon">💰</div>
          <p>Contul tău nu este legat de un profil de artist.</p>
        </div>
      </AppShell>
    )
  }

  const [revenues, activeContract] = await Promise.all([
    prisma.revenue.findMany({
      where: { artistId: artist.id },
      include: { track: true },
      orderBy: { period: 'desc' },
      take: 100,
    }),
    prisma.contract.findFirst({
      where: { artistId: artist.id, status: { in: ['ACTIVE', 'EXPIRING'] } },
      select: { royaltyPercent: true },
    }),
  ])

  const total = revenues.reduce((sum, r) => sum + r.amount, 0)
  const netEstimate = activeContract ? total * (activeContract.royaltyPercent / 100) : null

  const bySource: Record<string, number> = {}
  for (const r of revenues) {
    bySource[r.source] = (bySource[r.source] ?? 0) + r.amount
  }

  const topSource = Object.entries(bySource).sort(([, a], [, b]) => b - a)[0]

  return (
    <AppShell session={session} title="Veniturile mele">
      {/* ── Stats ── */}
      <section className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card card-stat">
          <div className="stat-value" style={{ color: 'var(--role-ar-dark)' }}>{total.toFixed(2)} €</div>
          <div className="stat-label">Total venituri brute</div>
        </div>
        {netEstimate !== null ? (
          <div className="card card-stat">
            <div className="stat-value" style={{ color: 'var(--role-artist-dark)' }}>{netEstimate.toFixed(2)} €</div>
            <div className="stat-label">Estimare câștig net ({activeContract!.royaltyPercent}%)</div>
          </div>
        ) : (
          <div className="card card-stat">
            <div className="stat-value">{revenues.length}</div>
            <div className="stat-label">Înregistrări</div>
          </div>
        )}
        <div className="card card-stat">
          <div className="stat-value">{bySource['STREAMING'] ? `${bySource['STREAMING'].toFixed(0)} €` : '—'}</div>
          <div className="stat-label">Din streaming</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{topSource ? SOURCE_LABELS[topSource[0]] ?? topSource[0] : '—'}</div>
          <div className="stat-label">Sursa principală</div>
        </div>
      </section>

      {/* ── Net earnings explanation ── */}
      {netEstimate !== null && (
        <div style={{
          marginBottom: 20, padding: '14px 18px',
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
          borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Estimarea câștigului net se calculează pe baza royalty-ului tău de{' '}
            <strong style={{ color: 'var(--role-artist-dark)' }}>{activeContract!.royaltyPercent}%</strong>{' '}
            din totalul veniturilor brute generate de muzica ta.
          </p>
        </div>
      )}

      {/* ── Chart ── */}
      {revenues.length > 0 && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Evoluție lunară</h3>
          <ArtistRevenueChart revenues={revenues} />
        </section>
      )}

      {/* ── Per source breakdown ── */}
      {Object.keys(bySource).length > 1 && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Distribuție pe surse</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(bySource).sort(([, a], [, b]) => b - a).map(([source, amount]) => {
              const pct = total > 0 ? (amount / total) * 100 : 0
              const sc  = SOURCE_COLORS[source] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
              return (
                <div key={source} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px', alignItems: 'center', gap: 12 }}>
                  <span className="badge" style={{ background: sc.bg, color: sc.color, justifyContent: 'center' }}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                  <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: sc.color, borderRadius: 4, opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{amount.toFixed(2)} €</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Detail table ── */}
      <section className="card">
        <h3 style={{ marginBottom: 12 }}>Detaliu venituri ({revenues.length})</h3>
        {revenues.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)' }}>Nu există venituri înregistrate încă.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Perioadă</th>
                  <th>Sursă</th>
                  <th>Piesă</th>
                  <th>Sumă</th>
                  {activeContract && <th>Net estimat</th>}
                </tr>
              </thead>
              <tbody>
                {revenues.map((revenue) => {
                  const sc = SOURCE_COLORS[revenue.source] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                  return (
                    <tr key={revenue.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{revenue.period}</td>
                      <td>
                        <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                          {SOURCE_LABELS[revenue.source] ?? revenue.source}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {revenue.track?.title ?? '—'}
                      </td>
                      <td><strong>{revenue.amount.toFixed(2)} €</strong></td>
                      {activeContract && (
                        <td style={{ color: 'var(--role-artist-dark)', fontSize: 13 }}>
                          {(revenue.amount * activeContract.royaltyPercent / 100).toFixed(2)} €
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}
