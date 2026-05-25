import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

function getCurrentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getDateIn30Days(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function FinanceManagerDashboard({ session }: { session: SessionPayload }) {
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
  const currentPeriod = getCurrentPeriod()
  const in30Days = getDateIn30Days()
  const today = getTodayStr()

  const [
    totalRevenueAgg,
    thisMonthAgg,
    pendingRoyaltiesAgg,
    pendingDetectionsCount,
    expiringContracts,
    topArtistsRevenue,
  ] = await Promise.all([
    prisma.revenue.aggregate({ where: { labelId }, _sum: { amount: true } }),
    prisma.revenue.aggregate({ where: { labelId, period: currentPeriod }, _sum: { amount: true } }),
    prisma.royaltyPayment.aggregate({ where: { labelId, status: 'PENDING' }, _sum: { amount: true } }),
    prisma.aIDetection.count({ where: { labelId, status: 'PENDING' } }),
    prisma.contract.findMany({
      where: {
        labelId,
        status: 'ACTIVE',
        endDate: { not: null, lte: in30Days, gte: today },
      },
      include: { artist: true },
      take: 5,
      orderBy: { endDate: 'asc' },
    }),
    prisma.revenue.groupBy({
      by: ['artistId'],
      where: { labelId, artistId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 3,
    }),
  ])

  // Resolve artist names for top revenue
  const artistIds = topArtistsRevenue
    .map((r) => r.artistId)
    .filter((id): id is string => id !== null)

  const topArtists = artistIds.length > 0
    ? await prisma.artist.findMany({ where: { id: { in: artistIds } }, select: { id: true, name: true } })
    : []

  const topArtistRows = topArtistsRevenue
    .filter((r) => r.artistId !== null)
    .map((r) => ({
      name: topArtists.find((a) => a.id === r.artistId)?.name ?? r.artistId ?? '—',
      amount: r._sum.amount ?? 0,
    }))

  const totalRevenue = totalRevenueAgg._sum.amount ?? 0
  const thisMonth = thisMonthAgg._sum.amount ?? 0
  const pendingRoyalties = pendingRoyaltiesAgg._sum.amount ?? 0

  return (
    <AppShell session={session} title="Acasă">

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>

        <div className="card card-stat">
          <div>
            <div className="stat-value" style={{ fontSize: 28, color: totalRevenue > 0 ? 'var(--role-ar-dark)' : undefined }}>
              {totalRevenue >= 1000
                ? `${(totalRevenue / 1000).toFixed(1)}k €`
                : `${totalRevenue.toFixed(0)} €`}
            </div>
            <div className="stat-label">Total venituri</div>
          </div>
        </div>

        <div className="card card-stat">
          <div>
            <div className="stat-value" style={{ fontSize: 28 }}>
              {thisMonth >= 1000
                ? `${(thisMonth / 1000).toFixed(1)}k €`
                : `${thisMonth.toFixed(0)} €`}
            </div>
            <div className="stat-label">Luna aceasta</div>
          </div>
        </div>

        <div className="card card-stat">
          <div>
            <div className="stat-value" style={{ fontSize: 28, color: pendingRoyalties > 0 ? 'var(--role-finance-dark)' : undefined }}>
              {pendingRoyalties >= 1000
                ? `${(pendingRoyalties / 1000).toFixed(1)}k €`
                : `${pendingRoyalties.toFixed(0)} €`}
            </div>
            <div className="stat-label">Royalties neplatite</div>
          </div>
        </div>

        <Link href="/compliance" style={{ textDecoration: 'none' }}>
          <div
            className="card card-stat"
            style={{
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <div>
              <div
                className="stat-value"
                style={{ fontSize: 32, color: pendingDetectionsCount > 0 ? 'var(--role-artist-dark)' : '#22d3ee' }}
              >
                {pendingDetectionsCount}
              </div>
              <div className="stat-label">Detecții AI deschise</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Contracte care expiră + Top artiști ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        {/* Contracte care expiră */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Contracte care expiră în 30 zile</h3>
            <Link href="/contracts" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Toate
            </Link>
          </div>
          {expiringContracts.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              Niciun contract nu expiră în următoarele 30 de zile.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expiringContracts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {c.artist.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {c.royaltyPercent}% royalty · {c.duration}
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--role-finance-dark)', flexShrink: 0 }}
                  >
                    Expiră {c.endDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 3 artiști după venituri */}
        <div className="card">
          <h3 style={{ margin: '0 0 14px' }}>Top artiști după venituri</h3>
          {topArtistRows.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nu există venituri înregistrate per artist.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topArtistRows.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, opacity: 0.5, fontWeight: 600 }}>
                      {i + 1}.
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--role-ar-dark)' }}>
                    {a.amount >= 1000
                      ? `${(a.amount / 1000).toFixed(1)}k €`
                      : `${a.amount.toFixed(0)} €`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alert royalties neplatite ── */}
      {pendingRoyalties > 0 && (
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
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--role-finance-dark)' }}>!</span>
          <span style={{ color: 'var(--role-finance-dark)', fontWeight: 500 }}>
            Royalties neplatite:{' '}
            {pendingRoyalties >= 1000
              ? `${(pendingRoyalties / 1000).toFixed(1)}k €`
              : `${pendingRoyalties.toFixed(0)} €`}
          </span>
          <Link href="/finance" style={{ color: 'var(--primary)', fontSize: 13, textDecoration: 'none' }}>
            Mergi la Finanțe
          </Link>
        </div>
      )}

    </AppShell>
  )
}
