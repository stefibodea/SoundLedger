import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SessionPayload } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

const PROSPECT_STATUSES = [
  { key: 'IDENTIFIED', label: 'Identificat', color: '#9b94f0' },
  { key: 'ANALYZING', label: 'Analiză', color: '#60a5fa' },
  { key: 'CONTACTED', label: 'Contactat', color: '#fbbf24' },
  { key: 'NEGOTIATION', label: 'Negociere', color: '#f97316' },
  { key: 'SIGNED', label: 'Semnat', color: '#4ade80' },
  { key: 'REJECTED', label: 'Respins', color: '#f87171' },
] as const

export async function ARManagerDashboard({ session }: { session: SessionPayload }) {
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

  const [
    totalProspects,
    prospectsByStatus,
    highScoreCount,
    artistsCount,
    plannedReleases,
    tracksWithAudio,
    fingerprintsCount,
  ] = await Promise.all([
    prisma.aRProspect.count({ where: { labelId } }),
    prisma.aRProspect.groupBy({
      by: ['status'],
      where: { labelId },
      _count: true,
    }),
    prisma.aRProspect.count({ where: { labelId, aiScore: { gt: 70 } } }),
    prisma.artist.count({ where: { labelId } }),
    prisma.release.findMany({
      where: { labelId, status: 'PLANNING' },
      take: 5,
      orderBy: { releaseDate: 'asc' },
      include: {
        track: { include: { artist: true } },
      },
    }),
    prisma.track.count({ where: { labelId, audioFile: { not: null } } }),
    prisma.audioFingerprint.count({ where: { labelId } }),
  ])

  const fingerprintsLacking = Math.max(0, tracksWithAudio - fingerprintsCount)

  const statusCountMap = Object.fromEntries(
    prospectsByStatus.map((g) => [g.status, g._count])
  )

  return (
    <AppShell session={session} title="Acasă">

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>

        <div className="card card-stat" style={{ borderTop: '3px solid #9b94f0' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 32 }}>{totalProspects}</div>
            <div className="stat-label">Total candidați</div>
          </div>
        </div>

        <div className="card card-stat" style={{ borderTop: '3px solid #4ade80' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 32, color: highScoreCount > 0 ? 'var(--role-ar-dark)' : undefined }}>
              {highScoreCount}
            </div>
            <div className="stat-label">Scor ridicat (&gt;70)</div>
          </div>
        </div>

        <div className="card card-stat" style={{ borderTop: '3px solid #60a5fa' }}>
          <div>
            <div className="stat-value" style={{ fontSize: 32 }}>{artistsCount}</div>
            <div className="stat-label">Artiști activi</div>
          </div>
        </div>

        <Link href="/compliance/fingerprints" style={{ textDecoration: 'none' }}>
          <div
            className="card card-stat"
            style={{
              borderTop: `3px solid ${fingerprintsLacking > 0 ? '#f87171' : '#4ade80'}`,
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <div>
              <div
                className="stat-value"
                style={{ fontSize: 32, color: fingerprintsLacking > 0 ? 'var(--role-artist-dark)' : 'var(--role-ar-dark)' }}
              >
                {fingerprintsLacking}
              </div>
              <div className="stat-label">Fingerprints lipsă</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Kanban snapshot + Lansări ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>

        {/* Kanban snapshot */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📊 Pipeline Scouting</h3>
            <Link href="/ar" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Kanban complet →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {PROSPECT_STATUSES.map(({ key, label, color }) => (
              <div
                key={key}
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color }}>{statusCountMap[key] ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lansări planificate */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>🗓 Lansări planificate</h3>
            <Link href="/releases" className="btn btn-ghost" style={{ fontSize: 12 }}>
              Toate →
            </Link>
          </div>
          {plannedReleases.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nicio lansare planificată.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plannedReleases.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.track?.title ?? 'Fără titlu'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {r.track?.artist?.name ?? '—'}
                    </div>
                  </div>
                  {r.releaseDate && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {r.releaseDate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alert fingerprints lipsă ── */}
      {fingerprintsLacking > 0 && (
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
          <div>
            <span style={{ color: 'var(--role-finance-dark)', fontWeight: 500 }}>
              {fingerprintsLacking} {fingerprintsLacking === 1 ? 'piesă fără fingerprint' : 'piese fără fingerprint'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {' '}— mergi la{' '}
              <Link href="/compliance/fingerprints" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                Fingerprints Audio
              </Link>{' '}
              pentru a proteja catalogul.
            </span>
          </div>
        </div>
      )}

    </AppShell>
  )
}
