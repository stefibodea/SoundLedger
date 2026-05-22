import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { AppShell } from '@/components/app-shell'
import { getArtistProfile } from '@/lib/artist-profile'

function getCurrentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getChecklistProgress(checklist: unknown): { done: number; total: number } {
  if (!Array.isArray(checklist)) return { done: 0, total: 0 }
  const total = checklist.length
  const done = checklist.filter(
    (item: unknown) =>
      typeof item === 'object' &&
      item !== null &&
      'done' in (item as object) &&
      (item as Record<string, unknown>).done === true
  ).length
  return { done, total }
}

export async function ArtistDashboard({ session }: { session: SessionPayload }) {
  const artist = await getArtistProfile(session)

  if (!artist) {
    return (
      <AppShell session={session} title="Acasă">
        <div className="card empty-state">
          <div className="empty-icon">🎵</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Contul tău nu este încă configurat.</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Contul tău de artist nu este legat de un profil. Contactează Label Manager-ul.
          </p>
        </div>
      </AppShell>
    )
  }

  const labelId = session.labelId!
  const currentPeriod = getCurrentPeriod()

  const [
    tracksCount,
    activeContract,
    totalRevenueAgg,
    thisMonthAgg,
    activeReleases,
    recentRoyalties,
  ] = await Promise.all([
    prisma.track.count({ where: { artistId: artist.id } }),
    prisma.contract.findFirst({
      where: { artistId: artist.id, status: { in: ['ACTIVE', 'EXPIRING'] } },
    }),
    prisma.revenue.aggregate({ where: { artistId: artist.id }, _sum: { amount: true } }),
    prisma.revenue.aggregate({
      where: { artistId: artist.id, period: currentPeriod },
      _sum: { amount: true },
    }),
    prisma.release.findMany({
      where: {
        labelId,
        status: { in: ['PLANNING', 'READY'] },
        track: { artistId: artist.id },
      },
      take: 3,
      include: { track: true },
      orderBy: { releaseDate: 'asc' },
    }),
    prisma.royaltyPayment.findMany({
      where: { artistId: artist.id, status: 'PAID' },
      take: 5,
      orderBy: { paidAt: 'desc' },
    }),
  ])

  const totalRevenue = totalRevenueAgg._sum.amount ?? 0
  const thisMonth = thisMonthAgg._sum.amount ?? 0
  const contractStatus = activeContract?.status ?? null

  const contractBadgeColor =
    contractStatus === 'ACTIVE'
      ? 'var(--role-ar-dark)'
      : contractStatus === 'EXPIRING'
        ? 'var(--role-finance-dark)'
        : 'var(--text-secondary)'

  const contractStatusLabel =
    contractStatus === 'ACTIVE'
      ? 'Activ'
      : contractStatus === 'EXPIRING'
        ? 'Expiră curând'
        : '—'

  return (
    <AppShell session={session} title={`Bună, ${artist.name}`} >

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>

        <div className="card card-stat" style={{ borderTop: '3px solid #9b94f0' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 32 }}>{tracksCount}</div>
            <div className="stat-label">Piese în catalog</div>
          </div>
        </div>

        <div className="card card-stat" style={{ borderTop: `3px solid ${contractBadgeColor}` }}>
          <div>
            <div className="stat-value" style={{ fontSize: 22, color: contractBadgeColor }}>
              {contractStatusLabel}
            </div>
            <div className="stat-label">Contract</div>
            {activeContract?.royaltyPercent != null && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {activeContract.royaltyPercent}% royalty
              </div>
            )}
          </div>
        </div>

        <div className="card card-stat" style={{ borderTop: '3px solid #4ade80' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 28, color: totalRevenue > 0 ? 'var(--role-ar-dark)' : undefined }}>
              {totalRevenue >= 1000
                ? `${(totalRevenue / 1000).toFixed(1)}k €`
                : `${totalRevenue.toFixed(0)} €`}
            </div>
            <div className="stat-label">Venituri totale</div>
          </div>
        </div>

        <div className="card card-stat" style={{ borderTop: '3px solid #60a5fa' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 28 }}>
              {thisMonth >= 1000
                ? `${(thisMonth / 1000).toFixed(1)}k €`
                : `${thisMonth.toFixed(0)} €`}
            </div>
            <div className="stat-label">Luna aceasta</div>
          </div>
        </div>
      </div>

      {/* ── Lansări + Royalties ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        {/* Lansări active */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>🗓 Lansări active</h3>
          </div>
          {activeReleases.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              Nu există lansări planificate sau pregătite.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeReleases.map((r) => {
                const { done, total } = getChecklistProgress(r.checklist)
                const progressPct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      borderLeft: `3px solid ${r.status === 'READY' ? 'var(--role-ar-dark)' : '#9b94f0'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: total > 0 ? 8 : 0 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {r.track?.title ?? 'Fără titlu'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {r.releaseDate ? `Data lansare: ${r.releaseDate}` : ''}
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: r.status === 'READY' ? 'rgba(74,222,128,0.1)' : 'rgba(155,148,240,0.1)',
                          color: r.status === 'READY' ? 'var(--role-ar-dark)' : '#9b94f0',
                          flexShrink: 0,
                        }}
                      >
                        {r.status === 'READY' ? 'Gata' : 'Planificat'}
                      </span>
                    </div>
                    {total > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {done}/{total} taskuri finalizate
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{progressPct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPct}%`,
                              background: r.status === 'READY' ? 'var(--role-ar-dark)' : 'var(--primary)',
                              borderRadius: 2,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Royalties recente */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>💸 Royalties recente</h3>
            <Link href="/my-revenues" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Toate →
            </Link>
          </div>
          {recentRoyalties.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              Nu au fost procesate royalties încă.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentRoyalties.map((rp) => (
                <div
                  key={rp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rp.period}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--role-ar-dark)' }}>
                    {rp.amount.toFixed(0)} €
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alert: fără contract activ ── */}
      {!activeContract && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>⚠</span>
          <span style={{ color: 'var(--role-finance-dark)', fontWeight: 500 }}>
            Nu ai un contract activ.
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Contactează Label Manager-ul pentru detalii.
          </span>
        </div>
      )}

    </AppShell>
  )
}
