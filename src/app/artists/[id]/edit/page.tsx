import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { updateArtistAction } from '@/app/actions/artists'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditArtistPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireSession()
  await enforceOnboarding(session, `/artists/${id}/edit`)
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const artist = await prisma.artist.findUnique({ where: { id } })
  if (!artist || artist.labelId !== session.labelId) notFound()

  return (
    <AppShell session={session} title={`Editează: ${artist.name}`}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/artists/${id}`} className="btn btn-secondary btn-sm">← Înapoi la profil</Link>
      </div>

      <section className="card">
        <form action={updateArtistAction}>
          <input type="hidden" name="id" value={id} />

          <h3 style={{ marginBottom: 20 }}>Informații generale</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nume artist *</label>
              <input name="name" className="form-input" defaultValue={artist.name} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nume real</label>
              <input name="realName" className="form-input" defaultValue={artist.realName ?? ''} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gen muzical *</label>
              <input name="genre" className="form-input" defaultValue={artist.genre} required />
            </div>
            <div className="form-group">
              <label className="form-label">Subgen</label>
              <input name="subgenre" className="form-input" defaultValue={artist.subgenre ?? ''} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Naționalitate</label>
              <input name="nationality" className="form-input" defaultValue={artist.nationality ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Data nașterii</label>
              <input name="birthDate" className="form-input" type="date" defaultValue={artist.birthDate ?? ''} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Foto profil</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              {artist.photo ? (
                <img
                  src={artist.photo}
                  alt={artist.name}
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-medium)' }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: 'var(--primary)',
                  flexShrink: 0,
                }}>
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>Încarcă imagine de pe calculator</label>
                <input name="photoFile" type="file" accept="image/*" className="form-input" style={{ padding: '6px 10px' }} />
              </div>
            </div>
            <label className="form-label" style={{ marginBottom: 4 }}>Sau introdu un URL de imagine</label>
            <input name="photoUrl" className="form-input" defaultValue={artist.photo?.startsWith('/uploads') ? '' : (artist.photo ?? '')} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Biografie</label>
            <textarea name="bio" className="form-input form-textarea" defaultValue={artist.bio ?? ''} />
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Contact</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email contact</label>
              <input name="contactEmail" className="form-input" type="email" defaultValue={artist.contactEmail ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefon</label>
              <input name="contactPhone" className="form-input" defaultValue={artist.contactPhone ?? ''} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nume manager</label>
              <input name="managerName" className="form-input" defaultValue={artist.managerName ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact manager</label>
              <input name="managerContact" className="form-input" defaultValue={artist.managerContact ?? ''} />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Linkuri & Social media</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Spotify URL</label>
              <input name="spotifyUrl" className="form-input" defaultValue={artist.spotifyUrl ?? ''} placeholder="https://open.spotify.com/artist/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Apple Music URL</label>
              <input name="appleMusicUrl" className="form-input" defaultValue={artist.appleMusicUrl ?? ''} placeholder="https://music.apple.com/..." />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">YouTube URL</label>
              <input name="youtubeUrl" className="form-input" defaultValue={artist.youtubeUrl ?? ''} placeholder="https://youtube.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram</label>
              <input name="instagram" className="form-input" defaultValue={artist.instagram ?? ''} placeholder="@username" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">TikTok</label>
              <input name="tiktok" className="form-input" defaultValue={artist.tiktok ?? ''} placeholder="@username" />
            </div>
            <div className="form-group" />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit">Salvează modificările</button>
            <Link href={`/artists/${id}`} className="btn btn-secondary">Anulează</Link>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
