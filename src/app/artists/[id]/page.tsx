import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { ArtistRevenueChart } from '@/components/artist-revenue-chart'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewArtists, canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'

type PageProps = {
  params: Promise<{ id: string }>
}

// ── Icoane platforme ──────────────────────────────────────────────────────────

function IconSpotify() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.469-.077-.335.132-.67.469-.746 3.809-.871 7.077-.496 9.713 1.115.294.18.386.563.207.856zm1.224-2.724c-.228.371-.711.486-1.082.259-2.687-1.652-6.785-2.131-9.965-1.166-.413.124-.849-.108-.973-.52-.125-.413.108-.848.52-.973 3.632-1.102 8.147-.568 11.241 1.324.372.228.486.712.26 1.076zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.623-.148-.495.13-1.015.624-1.164 3.525-1.073 9.386-.866 13.088 1.43.443.264.587.838.323 1.28-.264.443-.838.587-1.281.323z"/>
    </svg>
  )
}

function IconAppleMusic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 6.628 5.374 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm3.157 7.244l-4.54 1.02a.5.5 0 00-.39.488v5.517a2.235 2.235 0 00-1.135-.313c-1.226 0-2.22.877-2.22 1.96 0 1.081.994 1.958 2.22 1.958 1.225 0 2.22-.877 2.22-1.958V9.77l3.89-.873v4.108a2.236 2.236 0 00-1.135-.314c-1.226 0-2.22.878-2.22 1.96s.994 1.959 2.22 1.959c1.225 0 2.22-.877 2.22-1.959V7.717a.5.5 0 00-.13-.338.5.5 0 00-.12-.135z"/>
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/>
    </svg>
  )
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireSession()
  await enforceOnboarding(session, `/artists/${id}`)
  if (!session.labelId || !canViewArtists(session.role)) redirect('/dashboard')
  const canManage = canManageArtists(session.role)

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      tracks:    { orderBy: { createdAt: 'desc' }, take: 20 },
      contracts: { orderBy: { createdAt: 'desc' }, take: 5 },
      revenues:  { orderBy: { period: 'asc' } },
    },
  })

  if (!artist || artist.labelId !== session.labelId) notFound()

  const totalRevenue  = artist.revenues.reduce((sum, r) => sum + r.amount, 0)
  const activeContract = artist.contracts.find((c) => c.status === 'ACTIVE' || c.status === 'EXPIRING')

  return (
    <AppShell session={session} title={artist.name}>
      <style>{`
        .social-link {
          display: flex; align-items: center; gap: 10;
          padding: 10px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          text-decoration: none; font-size: 14px;
          color: var(--text-primary);
          background: rgba(255,255,255,0.03);
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
        }
        .social-link:hover { transform: translateX(3px); }
        .social-spotify:hover     { background: rgba(29,185,84,0.10);   border-color: rgba(29,185,84,0.3); }
        .social-apple:hover       { background: rgba(252,60,68,0.10);   border-color: rgba(252,60,68,0.3); }
        .social-youtube:hover     { background: rgba(255,0,0,0.10);     border-color: rgba(255,0,0,0.25); }
        .social-instagram:hover   { background: rgba(225,48,108,0.10);  border-color: rgba(225,48,108,0.3); }
        .social-tiktok:hover      { background: rgba(105,201,208,0.10); border-color: rgba(105,201,208,0.3); }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        {/* Avatar cu aura */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Glow ring */}
          <div style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(155,148,240,0.08) 50%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {artist.photo ? (
            <div style={{ position: 'relative', width: 88, height: 88 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artist.photo}
                alt={artist.name}
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
              {/* Gradient overlay pe foto */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(155,148,240,0.25) 0%, rgba(34,211,238,0.12) 100%)',
                pointerEvents: 'none',
              }} />
              {/* Border cyan */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                boxShadow: 'inset 0 0 0 2px rgba(34,211,238,0.45)',
                pointerEvents: 'none',
              }} />
            </div>
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: 'white',
              boxShadow: '0 0 0 2px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.2)',
            }}>
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{artist.name}</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginTop: 2 }}>
            {artist.genre}{artist.subgenre ? ` • ${artist.subgenre}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/artists" className="btn btn-secondary btn-sm">Artiști</Link>
          {activeContract && (
            <Link href={`/contracts/${activeContract.id}/preview`} className="btn btn-secondary btn-sm">
              Previzualizare contract
            </Link>
          )}
          {canManage && (
            <Link
              href={`/artists/${id}/edit`}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
                color: 'white', textDecoration: 'none', border: 'none',
                boxShadow: '0 0 12px rgba(56,189,248,0.25)',
              }}
            >
              Editează profil
            </Link>
          )}
        </div>
      </div>

      {/* ── Statistici ─────────────────────────────────────────────────────── */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card card-stat">
          <div className="stat-value">{artist.tracks.length}</div>
          <div className="stat-label">Piese în catalog</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{totalRevenue.toFixed(0)} €</div>
          <div className="stat-label">Venituri totale</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{activeContract ? `${activeContract.royaltyPercent}%` : '—'}</div>
          <div className="stat-label">Royalty contract activ</div>
        </div>
      </div>

      {/* ── Date generale + Social ─────────────────────────────────────────── */}
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <section className="card">
          <h3 style={{ marginBottom: 14 }}>Date generale</h3>
          <dl style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Nume real',     value: artist.realName },
              { label: 'Naționalitate', value: artist.nationality },
              { label: 'Data nașterii', value: artist.birthDate },
              { label: 'Email contact', value: artist.contactEmail },
              { label: 'Telefon',       value: artist.contactPhone },
              { label: 'Manager',       value: artist.managerName ? `${artist.managerName}${artist.managerContact ? ` — ${artist.managerContact}` : ''}` : null },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label}>
                <dt style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</dt>
                <dd style={{ fontSize: 14 }}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 14 }}>Linkuri & Social</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {artist.spotifyUrl && (
              <a href={artist.spotifyUrl} target="_blank" rel="noopener noreferrer" className="social-link social-spotify">
                <span style={{ color: '#1DB954' }}><IconSpotify /></span>
                Spotify
              </a>
            )}
            {artist.appleMusicUrl && (
              <a href={artist.appleMusicUrl} target="_blank" rel="noopener noreferrer" className="social-link social-apple">
                <span style={{ color: '#fc3c44' }}><IconAppleMusic /></span>
                Apple Music
              </a>
            )}
            {artist.youtubeUrl && (
              <a href={artist.youtubeUrl} target="_blank" rel="noopener noreferrer" className="social-link social-youtube">
                <span style={{ color: '#FF0000' }}><IconYouTube /></span>
                YouTube
              </a>
            )}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="social-link social-instagram">
                <span style={{ color: '#E1306C' }}><IconInstagram /></span>
                {artist.instagram}
              </a>
            )}
            {artist.tiktok && (
              <a href={`https://tiktok.com/@${artist.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="social-link social-tiktok">
                <span style={{ color: '#69C9D0' }}><IconTikTok /></span>
                {artist.tiktok}
              </a>
            )}
            {!artist.spotifyUrl && !artist.appleMusicUrl && !artist.youtubeUrl && !artist.instagram && !artist.tiktok && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                Niciun link adăugat.{' '}
                {canManage && <Link href={`/artists/${id}/edit`} style={{ color: 'var(--primary)' }}>Adaugă acum</Link>}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Biografie ──────────────────────────────────────────────────────── */}
      {artist.bio && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 10 }}>Biografie</h3>
          <p style={{ color: '#d8d6cf', lineHeight: 1.95, fontSize: 14 }}>{artist.bio}</p>
        </section>
      )}

      {/* ── Grafic venituri ────────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Evoluție venituri</h3>
        <ArtistRevenueChart revenues={artist.revenues} />
      </section>

      {/* ── Discografie ─────────────────────────────────────────────────────── */}
      <section className="card">
        <h3 style={{ marginBottom: 14 }}>Discografie ({artist.tracks.length} piese)</h3>
        {artist.tracks.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Nicio piesă adăugată încă.</p>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {artist.tracks.map((track) => (
              <div key={track.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border-light)',
              }}>
                <div>
                  <Link href={`/catalog/${track.id}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {track.title}
                  </Link>
                  {track.genre && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>{track.genre}</span>}
                </div>
                <span className="badge" style={{
                  fontSize: 11,
                  background: track.status === 'RELEASED' ? 'rgba(74,222,128,0.10)' : 'var(--bg-tertiary)',
                  color: track.status === 'RELEASED' ? '#4ade80' : 'var(--text-secondary)',
                }}>
                  {track.status === 'RELEASED' ? 'Lansat' : 'Nelansat'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
