import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageArtists } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { updateTrackAction, removeTrackAudioAction } from '@/app/actions/catalog'
import { getAudioFileUrl } from '@/lib/file-upload'

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

export default async function EditTrackPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { error } = await searchParams
  const session = await requireSession()
  await enforceOnboarding(session, `/catalog/${id}/edit`)
  if (!session.labelId || !canManageArtists(session.role)) redirect('/dashboard')

  const [track, creativeRecord, composers] = await Promise.all([
    prisma.track.findUnique({ where: { id }, include: { artist: true } }),
    prisma.creativeRecord.findUnique({ where: { trackId: id } }),
    prisma.composer.findMany({
      where: { labelId: session.labelId! },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, specialization: true },
    }),
  ])
  if (!track || track.labelId !== session.labelId) notFound()

  const audioUrl = getAudioFileUrl(track.audioFile)

  return (
    <AppShell session={session} title={`Editează: ${track.title}`}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/catalog/${id}`} className="btn btn-secondary btn-sm">Înapoi la piesă</Link>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(252,165,165,0.1)', border: '1px solid var(--role-artist-dark)', borderRadius: 8, color: 'var(--role-artist-dark)', fontSize: 14 }}>
          {decodeURIComponent(error)}
        </div>
      )}

      <section className="card">
        <form action={updateTrackAction}>
          <input type="hidden" name="id" value={id} />

          <h3 style={{ marginBottom: 20 }}>Informații generale</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Titlu *</label>
              <input name="title" className="form-input" defaultValue={track.title} required />
            </div>
            <div className="form-group">
              <label className="form-label">Tip</label>
              <select name="type" className="form-input form-select" defaultValue={track.type}>
                <option value="SINGLE">Single</option>
                <option value="ALBUM_TRACK">Track album</option>
                <option value="EP_TRACK">Track EP</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gen muzical</label>
              <input name="genre" className="form-input" defaultValue={track.genre ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Subgen</label>
              <input name="subgenre" className="form-input" defaultValue={track.subgenre ?? ''} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ISRC</label>
              <input name="isrc" className="form-input" defaultValue={track.isrc ?? ''} placeholder="ROABC2400001" />
            </div>
            <div className="form-group">
              <label className="form-label">Data lansării</label>
              <input name="releaseDate" className="form-input" type="date" defaultValue={track.releaseDate ?? ''} />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Date tehnice</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">BPM</label>
              <input name="bpm" className="form-input" type="number" min="40" max="300" defaultValue={track.bpm ?? ''} />
            </div>
            <div className="form-group">
              <label className="form-label">Tonalitate</label>
              <input name="key" className="form-input" defaultValue={track.key ?? ''} placeholder="ex: C minor" />
            </div>
            <div className="form-group">
              <label className="form-label">Durată (secunde)</label>
              <input name="duration" className="form-input" type="number" defaultValue={track.duration ?? ''} placeholder="ex: 213" />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px' }}>Credite</h3>
          {composers.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: 'var(--text-tertiary)' }}>
              Membrii echipei: {composers.map((c) => (
                <span key={c.id} style={{ marginRight: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {c.name}{c.specialization ? ` (${c.specialization})` : ''}
                </span>
              ))}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Compoziție melodică</label>
              <input name="rolesCompozitie" className="form-input" defaultValue={creativeRecord?.rolesCompozitie ?? track.composers ?? ''} placeholder="Nume separate prin virgulă" />
            </div>
            <div className="form-group">
              <label className="form-label">Versuri</label>
              <input name="rolesVersuri" className="form-input" defaultValue={creativeRecord?.rolesVersuri ?? ''} placeholder="Autori versuri" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Producție</label>
              <input name="rolesProductie" className="form-input" defaultValue={creativeRecord?.rolesProductie ?? track.producers ?? ''} placeholder="Producători, beat makers" />
            </div>
            <div className="form-group">
              <label className="form-label">Mixaj &amp; Mastering</label>
              <input name="rolesMixaj" className="form-input" defaultValue={creativeRecord?.rolesMixaj ?? ''} placeholder="Sound engineers, mixeri" />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Cover art</h3>
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              {track.coverArt ? (
                <img src={track.coverArt} alt={track.title} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-medium)' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}></div>
              )}
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>Încarcă imagine de pe calculator</label>
                <input name="coverFile" type="file" accept="image/*" className="form-input" style={{ padding: '6px 10px' }} />
              </div>
            </div>
            <label className="form-label" style={{ marginBottom: 4 }}>Sau introdu un URL de imagine</label>
            <input name="coverUrl" className="form-input" defaultValue={track.coverArt?.startsWith('/uploads') ? '' : (track.coverArt ?? '')} placeholder="https://..." />
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Fișier audio</h3>
          <div className="form-group">
            {audioUrl && (
              <div style={{ marginBottom: 14, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Fișier curent: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{track.audioFile}</span>
                </div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 10 }} />
              </div>
            )}
            <label className="form-label" style={{ marginBottom: 4 }}>
              {audioUrl ? 'Înlocuiește fișierul audio' : 'Încarcă fișier audio'}
            </label>
            <input
              name="audioFile"
              type="file"
              accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/ogg,.mp3,.wav,.flac,.m4a,.ogg"
              className="form-input"
              style={{ padding: '6px 10px' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              Lasă gol pentru a păstra fișierul curent. Maxim 50MB. Formate acceptate: MP3, WAV, FLAC, M4A, OGG.
            </p>
          </div>

          <h3 style={{ margin: '24px 0 20px' }}>Versuri</h3>
          <div className="form-group">
            <textarea name="lyrics" className="form-input form-textarea" defaultValue={track.lyrics ?? ''} style={{ minHeight: 200 }} placeholder="Introdu versurile piesei..." />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" type="submit">Salvează modificările</button>
            <Link href={`/catalog/${id}`} className="btn btn-secondary">Anulează</Link>
          </div>
        </form>
      </section>

      {audioUrl && (
        <section className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14 }}>Șterge fișierul audio</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Ștergerea fișierului audio va elimina și amprenta sonoră calculată (dacă există), invalidând comparațiile AI pentru această piesă.
          </p>
          <form action={removeTrackAudioAction}>
            <input type="hidden" name="trackId" value={id} />
            <button type="submit" className="btn btn-secondary btn-sm" style={{ color: 'var(--role-artist-dark)', borderColor: 'var(--role-artist-dark)' }}>
              Șterge fișierul audio
            </button>
          </form>
        </section>
      )}
    </AppShell>
  )
}
