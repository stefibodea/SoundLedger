import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCatalog, canManageArtists, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { toggleTrackStatusAction } from '@/app/actions/catalog'
import { computeFingerprintFromCatalogPage, deleteFingerprintForTrack } from '@/app/actions/fingerprints'
import { getAudioFileUrl } from '@/lib/file-upload'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string; fpOk?: string; fpError?: string }>
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function TrackDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const successMsg = sp.success === 'audio_removed'
    ? 'Fișierul audio a fost șters.'
    : sp.success === 'fingerprint_computed'
    ? 'Fingerprint-ul a fost calculat cu succes.'
    : null
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : (sp.fpError ? decodeURIComponent(sp.fpError) : null)
  const fpOk = sp.fpOk === '1'

  const session = await requireSession()
  await enforceOnboarding(session, `/catalog/${id}`)
  if (!session.labelId || !canViewCatalog(session.role)) redirect('/dashboard')

  const track = await prisma.track.findUnique({
    where: { id },
    include: {
      artist: true,
      album:  true,
      revenues: { orderBy: { period: 'asc' } },
      fingerprint: true,
    },
  })

  if (!track || track.labelId !== session.labelId) notFound()

  const canWrite      = canManageArtists(session.role)
  const canFP         = canManageCompliance(session.role)
  const totalRevenue  = track.revenues.reduce((sum, r) => sum + r.amount, 0)
  const audioUrl      = getAudioFileUrl(track.audioFile)

  const TYPE_LABELS: Record<string, string> = { SINGLE: 'Single', ALBUM_TRACK: 'Track album', EP_TRACK: 'Track EP' }

  return (
    <AppShell session={session} title={track.title}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        {track.coverArt ? (
          <img src={track.coverArt} alt={track.title} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-medium)' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
            🎵
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{track.title}</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            <Link href={`/artists/${track.artist.id}`} style={{ color: 'var(--primary)' }}>{track.artist.name}</Link>
            {track.genre && ` • ${track.genre}`}
            {track.releaseDate && ` • ${track.releaseDate}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canWrite && (
            <form action={toggleTrackStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="returnTo" value={`/catalog/${id}`} />
              <button type="submit" className={`btn btn-sm ${track.status === 'RELEASED' ? 'btn-secondary' : 'btn-primary'}`}>
                {track.status === 'RELEASED' ? 'Marchează nelansat' : 'Marchează lansat'}
              </button>
            </form>
          )}
          <Link href="/catalog" className="btn btn-secondary btn-sm">← Catalog</Link>
          {canWrite && <Link href={`/catalog/${id}/edit`} className="btn btn-primary btn-sm">Editează</Link>}
        </div>
      </div>

      {/* Notificări inline */}
      {(successMsg || fpOk) && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(110,231,183,0.1)', border: '1px solid var(--role-ar-dark)', borderRadius: 8, color: 'var(--role-ar-dark)', fontSize: 14 }}>
          ✓ {successMsg ?? 'Amprenta audio a fost calculată și salvată cu succes.'}
        </div>
      )}
      {errorMsg && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(252,165,165,0.1)', border: '1px solid var(--role-artist-dark)', borderRadius: 8, color: 'var(--role-artist-dark)', fontSize: 14 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Statistici */}
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card card-stat">
          <div className="stat-value" style={{ fontSize: 20 }}>
            <span className="badge" style={{
              background: track.status === 'RELEASED' ? 'var(--role-ar-light)' : 'var(--bg-tertiary)',
              color: track.status === 'RELEASED' ? 'var(--role-ar-dark)' : 'var(--text-secondary)',
              fontSize: 14, padding: '4px 12px',
            }}>
              {track.status === 'RELEASED' ? 'Lansat' : 'Nelansat'}
            </span>
          </div>
          <div className="stat-label">Status</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{totalRevenue > 0 ? `${totalRevenue.toFixed(0)} €` : '—'}</div>
          <div className="stat-label">Venituri totale</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{track.duration ? formatDuration(track.duration) : '—'}</div>
          <div className="stat-label">Durată</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* Metadata */}
        <section className="card">
          <h3 style={{ marginBottom: 14 }}>Informații tehnice</h3>
          <dl style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Tip',          value: TYPE_LABELS[track.type] ?? track.type },
              { label: 'Gen',          value: track.genre },
              { label: 'Subgen',       value: track.subgenre },
              { label: 'ISRC',         value: track.isrc },
              { label: 'BPM',          value: track.bpm?.toString() },
              { label: 'Tonalitate',   value: track.key },
              { label: 'Durată',       value: track.duration ? formatDuration(track.duration) : null },
              { label: 'Data lansării', value: track.releaseDate },
              { label: 'Album',        value: track.album?.title },
            ].filter(({ value }) => value).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                <dt style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</dt>
                <dd style={{ fontSize: 13, fontWeight: 500 }}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Credite */}
        <section className="card">
          <h3 style={{ marginBottom: 14 }}>Credite</h3>
          {track.composers || track.producers ? (
            <dl style={{ display: 'grid', gap: 12 }}>
              {track.composers && (
                <div>
                  <dt style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Compozitori</dt>
                  <dd style={{ fontSize: 14 }}>{track.composers}</dd>
                </div>
              )}
              {track.producers && (
                <div>
                  <dt style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Producători</dt>
                  <dd style={{ fontSize: 14 }}>{track.producers}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
              Niciun credit adăugat.{canWrite && <> <Link href={`/catalog/${id}/edit`} style={{ color: 'var(--primary)' }}>Adaugă →</Link></>}
            </p>
          )}

          {track.revenues.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venituri pe perioadă</h4>
              <div style={{ display: 'grid', gap: 6 }}>
                {track.revenues.slice(-5).map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{r.period} — {r.source}</span>
                    <strong>{r.amount.toFixed(2)} €</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Fișier Audio */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>🎵 Fișier audio</h3>
        {audioUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls src={audioUrl} style={{ width: '100%' }} />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Această piesă nu are fișier audio asociat.
            {canWrite && (
              <> <Link href={`/catalog/${id}/edit`} style={{ color: 'var(--primary)' }}>Încarcă un MP3 din pagina de editare →</Link></>
            )}
          </p>
        )}
      </section>

      {/* Fingerprint Audio */}
      {canFP && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>🎯 Fingerprint audio</h3>

          {!track.audioFile ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Adaugă un fișier audio pentru a calcula fingerprint-ul ML.{' '}
              {canWrite && <Link href={`/catalog/${id}/edit`} style={{ color: 'var(--primary)' }}>Editează piesa →</Link>}
            </p>
          ) : !track.fingerprint ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Această piesă are audio, dar fingerprint-ul nu a fost calculat încă.
                Fingerprint-ul (MFCC + chroma + tempo) e necesar pentru detecția similarității AI.
              </p>
              <form action={computeFingerprintFromCatalogPage}>
                <input type="hidden" name="trackId" value={id} />
                <button type="submit" className="btn btn-primary btn-sm">⊕ Calculează fingerprint</button>
              </form>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Tempo detectat',  value: `${track.fingerprint.tempo.toFixed(1)} BPM` },
                  { label: 'Durată analizată', value: formatDuration(Math.round(track.fingerprint.duration)) },
                  { label: 'Sample rate',     value: `${track.fingerprint.sampleRate} Hz` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                Calculat la {new Date(track.fingerprint.computedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <form action={computeFingerprintFromCatalogPage}>
                  <input type="hidden" name="trackId" value={id} />
                  <button type="submit" className="btn btn-secondary btn-sm">↻ Recalculează</button>
                </form>
                <form action={deleteFingerprintForTrack}>
                  <input type="hidden" name="trackId" value={id} />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ color: 'var(--role-artist-dark)' }}>
                    Șterge fingerprint
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      )}

      {/* Versuri */}
      {track.lyrics && (
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Versuri</h3>
          <pre style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {track.lyrics}
          </pre>
        </section>
      )}
    </AppShell>
  )
}
