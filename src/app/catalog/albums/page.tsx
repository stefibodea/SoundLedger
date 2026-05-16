import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCatalog, canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { createAlbumAction } from '@/app/actions/catalog'

const TYPE_LABELS: Record<string, string> = { ALBUM: 'Album', EP: 'EP' }

export default async function AlbumsPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/catalog/albums')
  if (!session.labelId || !canViewCatalog(session.role)) redirect('/dashboard')

  const [albums, artists] = await Promise.all([
    prisma.album.findMany({
      where: { labelId: session.labelId },
      include: {
        artist: true,
        _count: { select: { tracks: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { labelId: session.labelId },
      orderBy: { name: 'asc' },
    }),
  ])

  const canWrite = canManageArtists(session.role)

  return (
    <AppShell session={session} title="Albume & EP-uri">
      <div style={{ marginBottom: 20 }}>
        <Link href="/catalog" className="btn btn-secondary btn-sm">← Catalog piese</Link>
      </div>

      {canWrite && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Adaugă album / EP nou</h3>
          <form action={createAlbumAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Titlu *</label>
                <input name="title" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Artist *</label>
                <select name="artistId" className="form-input form-select" required>
                  <option value="">Selectează artist</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tip</label>
                <select name="type" className="form-input form-select">
                  <option value="ALBUM">Album</option>
                  <option value="EP">EP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data lansării</label>
                <input name="releaseDate" className="form-input" type="date" />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Salvează</button>
          </form>
        </section>
      )}

      {albums.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎵</div>
            <p className="empty-state-title">Niciun album înregistrat</p>
            <p className="empty-state-text">Adaugă primul album sau EP al label-ului tău.</p>
          </div>
        </section>
      ) : (
        <div className="grid grid-3">
          {albums.map((album) => (
            <div key={album.id} className="card">
              {album.coverArt ? (
                <img src={album.coverArt} alt={album.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 12 }}>🎵</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{album.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{album.artist.name}</p>
                </div>
                <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 11 }}>
                  {TYPE_LABELS[album.type] ?? album.type}
                </span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-tertiary)' }}>
                <span>{album._count.tracks} piese</span>
                {album.releaseDate && <span>{album.releaseDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
