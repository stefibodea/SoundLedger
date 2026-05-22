import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { getArtistProfile } from '@/lib/artist-profile'

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YouTube Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV',
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

export default async function MyMusicPage() {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/dashboard')

  const artist = await getArtistProfile(session)

  if (!artist) {
    return (
      <AppShell session={session} title="Muzica mea">
        <div className="card empty-state">
          <div className="empty-icon">🎵</div>
          <p>Contul tău nu este legat de un profil de artist.</p>
        </div>
      </AppShell>
    )
  }

  const tracks = await prisma.track.findMany({
    where: { artistId: artist.id },
    include: { revenues: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalRevenue = tracks.flatMap((t) => t.revenues).reduce((sum, r) => sum + r.amount, 0)
  const totalStreams  = tracks.flatMap((t) => t.revenues).reduce((sum, r) => sum + (r.streams ?? 0), 0)
  const released     = tracks.filter((t) => t.status === 'RELEASED').length

  return (
    <AppShell session={session} title="Muzica mea">
      {/* ── Stats ── */}
      <section className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card card-stat">
          <div className="stat-value">{tracks.length}</div>
          <div className="stat-label">Piese în catalog</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value" style={{ color: 'var(--role-ar-dark)' }}>{released}</div>
          <div className="stat-label">Piese lansate</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value" style={{ color: 'var(--role-finance-dark)' }}>{totalRevenue.toFixed(0)} €</div>
          <div className="stat-label">Venituri totale</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value" style={{ fontSize: totalStreams > 0 ? (totalStreams >= 1_000_000 ? 22 : 28) : 28 }}>
            {totalStreams > 0 ? (totalStreams >= 1_000_000 ? `${(totalStreams / 1_000_000).toFixed(1)}M` : totalStreams.toLocaleString('ro-RO')) : '—'}
          </div>
          <div className="stat-label">Streamuri totale</div>
        </div>
      </section>

      {tracks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🎵</div>
          <p>Nicio piesă adăugată în catalog încă.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {tracks.map((track) => {
            const trackRevenue = track.revenues.reduce((sum, r) => sum + r.amount, 0)
            const trackStreams  = track.revenues.reduce((sum, r) => sum + (r.streams ?? 0), 0)
            const revenueShare  = totalRevenue > 0 ? (trackRevenue / totalRevenue) * 100 : 0

            const revenueBySource: Record<string, number> = {}
            for (const r of track.revenues) {
              revenueBySource[r.source] = (revenueBySource[r.source] ?? 0) + r.amount
            }

            const isReleased = track.status === 'RELEASED'

            return (
              <div key={track.id} className="card" style={{ padding: '20px 24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>
                        {isReleased ? '🎵' : '🎚️'}
                      </span>
                      <strong style={{ fontSize: 16 }}>{track.title}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{
                        background: isReleased ? 'var(--role-ar-light)' : 'var(--bg-tertiary)',
                        color:      isReleased ? 'var(--role-ar-dark)'  : 'var(--text-secondary)',
                      }}>
                        {isReleased ? 'Lansat' : 'Nelandsat'}
                      </span>
                      {track.genre && (
                        <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {track.genre}
                        </span>
                      )}
                      {track.type && track.type !== 'SINGLE' && (
                        <span className="badge" style={{ background: 'var(--role-label-light)', color: 'var(--role-label-dark)' }}>
                          {track.type === 'ALBUM_TRACK' ? 'Album' : 'EP'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--role-ar-dark)' }}>
                      {trackRevenue.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>venituri generate</div>
                    {trackStreams > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {trackStreams.toLocaleString('ro-RO')} streamuri
                      </div>
                    )}
                  </div>
                </div>

                {/* Revenue share progress bar */}
                {totalRevenue > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Cotă din venituri totale
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{revenueShare.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${revenueShare}%`,
                        background: 'linear-gradient(90deg, var(--role-artist) 0%, var(--primary) 100%)',
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                )}

                {/* Metadata chips */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: Object.keys(revenueBySource).length > 0 ? 12 : 0 }}>
                  {track.isrc && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>ISRC </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{track.isrc}</span>
                    </div>
                  )}
                  {track.bpm && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>BPM </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{track.bpm}</span>
                    </div>
                  )}
                  {track.key && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tonalitate </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{track.key}</span>
                    </div>
                  )}
                  {track.releaseDate && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Lansare </span>
                      <span style={{ fontSize: 13 }}>{track.releaseDate}</span>
                    </div>
                  )}
                </div>

                {/* Revenue by source */}
                {Object.keys(revenueBySource).length > 0 && (
                  <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {Object.entries(revenueBySource)
                      .sort(([, a], [, b]) => b - a)
                      .map(([source, amount]) => (
                        <div key={source} style={{ fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{SOURCE_LABELS[source] ?? source}:</span>{' '}
                          <strong>{amount.toFixed(2)} €</strong>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
