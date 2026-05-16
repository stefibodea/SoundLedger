import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { getArtistProfile } from '@/lib/artist-profile'
import { requestProfileModificationAction } from '@/app/actions/artist-requests'
import { generateArtistBioAction } from '@/app/actions/ai'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function MyProfilePage({ searchParams }: PageProps) {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/dashboard')

  const params = (await searchParams) ?? {}
  const success = typeof params.success === 'string' ? params.success : null
  const error   = typeof params.error   === 'string' ? params.error   : null

  const artist = await getArtistProfile(session)

  if (!artist) {
    return (
      <AppShell session={session} title="Profilul meu">
        <div className="card empty-state">
          <div className="empty-icon">🎵</div>
          <p>Contul tău nu este încă legat de un profil de artist.</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginTop: 8 }}>
            Contactează Label Manager-ul pentru a-ți activa profilul.
          </p>
        </div>
      </AppShell>
    )
  }

  const initials = artist.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const socialLinks = [
    artist.spotifyUrl    && { label: 'Spotify',      href: artist.spotifyUrl,    icon: '🎵', sub: null },
    artist.youtubeUrl    && { label: 'YouTube',       href: artist.youtubeUrl,    icon: '▶',  sub: null },
    artist.appleMusicUrl && { label: 'Apple Music',   href: artist.appleMusicUrl, icon: '🎶', sub: null },
    artist.instagram     && { label: 'Instagram',     href: `https://instagram.com/${artist.instagram.replace('@', '')}`, icon: '📷', sub: artist.instagram },
    artist.tiktok        && { label: 'TikTok',        href: `https://tiktok.com/@${artist.tiktok.replace('@', '')}`,      icon: '🎵', sub: artist.tiktok },
  ].filter(Boolean) as { label: string; href: string; icon: string; sub: string | null }[]

  return (
    <AppShell session={session} title="Profilul meu" subtitle="Datele tale din platformă">
      {success && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-ar-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-ar-dark)', margin: 0 }}>{decodeURIComponent(success)}</p>
        </div>
      )}
      {error && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(error.replace(/\+/g, ' '))}</p>
        </div>
      )}

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #2d0a18 0%, #1e1030 55%, #1c1b22 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '32px 28px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: 20, top: -8, fontSize: 150, opacity: 0.04, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>♪</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--role-artist) 0%, #c4446c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 20px rgba(248,113,113,0.35)',
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>{artist.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--role-artist-dark)', fontWeight: 600, fontSize: 13 }}>
                {artist.genre}
              </span>
              {artist.subgenre && (
                <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{artist.subgenre}</span>
              )}
              {artist.nationality && (
                <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{artist.nationality}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <section className="card">
          <h3 style={{ marginBottom: 16 }}>Date generale</h3>
          <dl style={{ display: 'grid', gap: 14 }}>
            {artist.realName && (
              <div>
                <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Nume real</dt>
                <dd style={{ fontWeight: 500 }}>{artist.realName}</dd>
              </div>
            )}
            {artist.birthDate && (
              <div>
                <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Data nașterii</dt>
                <dd style={{ fontWeight: 500 }}>{artist.birthDate}</dd>
              </div>
            )}
            {artist.contactEmail && (
              <div>
                <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Email contact</dt>
                <dd style={{ fontWeight: 500 }}>{artist.contactEmail}</dd>
              </div>
            )}
            {artist.contactPhone && (
              <div>
                <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Telefon</dt>
                <dd style={{ fontWeight: 500 }}>{artist.contactPhone}</dd>
              </div>
            )}
            {artist.managerName && (
              <div>
                <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Manager personal</dt>
                <dd style={{ fontWeight: 500 }}>{artist.managerName}{artist.managerContact ? ` — ${artist.managerContact}` : ''}</dd>
              </div>
            )}
            {!artist.realName && !artist.birthDate && !artist.contactEmail && !artist.contactPhone && !artist.managerName && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nicio informație suplimentară adăugată.</p>
            )}
          </dl>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 16 }}>Social media & linkuri</h3>
          {socialLinks.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Niciun link social adăugat.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {socialLinks.map(({ label, href, icon, sub }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', gap: 12, padding: '10px 14px', height: 'auto', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                    {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>{sub}</div>}
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.5 }}>↗</span>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Biografie</h3>
          <form action={generateArtistBioAction}>
            <button className="btn btn-secondary btn-sm" type="submit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨</span> {artist.bio ? 'Regenerează cu AI' : 'Generează cu AI'}
            </button>
          </form>
        </div>
        {artist.bio ? (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>{artist.bio}</p>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            Nu există o biografie. Folosește butonul de mai sus pentru a genera una automat cu AI.
          </p>
        )}
      </section>

      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Solicită modificare profil</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Dacă informațiile nu sunt corecte, trimite o solicitare Label Manager-ului.
            </p>
          </div>
          <form action={requestProfileModificationAction} style={{ flexShrink: 0 }}>
            <button className="btn btn-secondary" type="submit">Trimite solicitare</button>
          </form>
        </div>
      </section>
    </AppShell>
  )
}
