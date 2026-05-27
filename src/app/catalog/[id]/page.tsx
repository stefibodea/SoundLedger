import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCatalog, canManageArtists, canManageCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { toggleTrackStatusAction, declareCreativeRecordAction } from '@/app/actions/catalog'
import { createReleaseAction } from '@/app/actions/releases'
import { computeFingerprintFromCatalogPage, deleteFingerprintForTrack } from '@/app/actions/fingerprints'
import { getAudioFileUrl } from '@/lib/file-upload'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string; fpOk?: string; fpError?: string; declared?: string }>
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
    : sp.declared === '1'
    ? 'Declarația creativă a fost salvată.'
    : sp.fpOk === '1'
    ? 'Amprenta audio a fost calculată și salvată.'
    : sp.success === 'release_created'
    ? 'Lansarea a fost creată. O poți gestiona din pagina Lansări.'
    : null
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : (sp.fpError ? decodeURIComponent(sp.fpError) : null)

  const session = await requireSession()
  await enforceOnboarding(session, `/catalog/${id}`)
  if (!session.labelId || !canViewCatalog(session.role)) redirect('/dashboard')

  const [track, composers] = await Promise.all([
    prisma.track.findUnique({
      where: { id },
      include: {
        artist: true,
        album:  true,
        revenues:       { orderBy: { period: 'asc' } },
        fingerprint:    true,
        creativeRecord: true,
        humanMadeCert:  true,
        releases:       { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.composer.findMany({
      where: { labelId: session.labelId! },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, specialization: true },
    }),
  ])

  if (!track || track.labelId !== session.labelId) notFound()

  const canWrite   = canManageArtists(session.role)
  const canFP      = canManageCompliance(session.role)
  const canDeclare = canManageCompliance(session.role)
  const totalRevenue = track.revenues.reduce((sum, r) => sum + r.amount, 0)
  const audioUrl   = getAudioFileUrl(track.audioFile)

  const TYPE_LABELS: Record<string, string> = { SINGLE: 'Single', ALBUM_TRACK: 'Track album', EP_TRACK: 'Track EP' }

  const cr = track.creativeRecord
  const declarationType: 'UMAN' | 'AI' | null = cr
    ? (cr.aiCompozitie || cr.aiVersuri || cr.aiVoce || cr.aiProductie || !!cr.aiAltele ? 'AI' : 'UMAN')
    : null
  const hasCert = track.humanMadeCert && !track.humanMadeCert.isRevoked

  return (
    <AppShell session={session} title={track.title}>

      {/* ── Notificări ─────────────────────────────────────────────────────── */}
      {successMsg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(110,231,183,0.08)', border: '1px solid var(--role-ar-dark)', borderRadius: 8, color: 'var(--role-ar-dark)', fontSize: 13 }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(252,165,165,0.08)', border: '1px solid var(--role-artist-dark)', borderRadius: 8, color: 'var(--role-artist-dark)', fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28, padding: '24px', background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border-light)' }}>
        {/* Cover */}
        {track.coverArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.coverArt}
            alt={track.title}
            style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          />
        ) : (
          <div style={{ width: 160, height: 160, borderRadius: 12, background: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48, opacity: 0.3 }}>🎵</span>
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: track.status === 'RELEASED' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
              color: track.status === 'RELEASED' ? '#4ade80' : 'var(--text-tertiary)',
              border: `1px solid ${track.status === 'RELEASED' ? 'rgba(74,222,128,0.3)' : 'var(--border-light)'}`,
            }}>
              {track.status === 'RELEASED' ? 'Lansat' : 'Nelansat'}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: 'rgba(155,148,240,0.1)', border: '1px solid rgba(155,148,240,0.25)', color: 'var(--primary)' }}>
              {TYPE_LABELS[track.type] ?? track.type}
            </span>
            {track.genre && (
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                {track.genre}
              </span>
            )}
            {declarationType && (
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: hasCert ? 'pointer' : 'default',
                background: declarationType === 'UMAN' ? 'rgba(110,231,183,0.1)' : 'rgba(253,230,138,0.1)',
                border: `1px solid ${declarationType === 'UMAN' ? 'rgba(110,231,183,0.3)' : 'rgba(253,230,138,0.3)'}`,
                color: declarationType === 'UMAN' ? 'var(--role-ar-dark)' : 'var(--role-finance-dark)',
              }}>
                {declarationType === 'UMAN' ? 'Human Made' : 'Contine AI'}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8, wordBreak: 'break-word' }}>
            {track.title}
          </h1>

          {/* Artist + meta */}
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
            <Link href={`/artists/${track.artist.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
              {track.artist.name}
            </Link>
            {track.album && <span> · {track.album.title}</span>}
            {track.releaseDate && <span> · {track.releaseDate}</span>}
            {track.duration && <span> · {formatDuration(track.duration)}</span>}
            {totalRevenue > 0 && <span> · <strong style={{ color: 'var(--text-primary)' }}>{totalRevenue.toFixed(0)} €</strong> venituri</span>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canWrite && track.status !== 'RELEASED' && (
              <form action={toggleTrackStatusAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="returnTo" value={`/catalog/${id}`} />
                <button type="submit" className="btn btn-primary btn-sm">Marchează lansat</button>
              </form>
            )}
            {canWrite && <Link href={`/catalog/${id}/edit`} className="btn btn-primary btn-sm">Editează</Link>}
            <Link href="/catalog" className="btn btn-secondary btn-sm">Catalog</Link>
          </div>
        </div>
      </div>

      {/* ── Layout principal 70/30 ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── Coloana principală ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Player audio */}
          <section className="card">
            <h3 style={{ marginBottom: 14 }}>Fisier audio</h3>
            {audioUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={audioUrl} style={{ width: '100%' }} />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Piesa nu are fisier audio asociat.
                {canWrite && <> <Link href={`/catalog/${id}/edit`} style={{ color: 'var(--primary)' }}>Incarca din pagina de editare</Link></>}
              </p>
            )}
          </section>

          {/* Declaratie creativa */}
          {canDeclare && (
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <h3>Declaratie creativa</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {hasCert && (
                    <Link
                      href={`/compliance/certificates/${track.humanMadeCert!.id}`}
                      style={{
                        fontSize: 12, padding: '4px 12px', borderRadius: 999,
                        background: 'rgba(110,231,183,0.10)', border: '1px solid rgba(110,231,183,0.30)',
                        color: 'var(--role-ar-dark)', fontWeight: 600, textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        transition: 'background 0.15s ease',
                      }}
                      title="Deschide certificatul Human Made"
                    >
                      ✓ Human Made · {track.humanMadeCert!.certificateCode}
                    </Link>
                  )}
                  {declarationType === 'AI' && cr?.declarationCode && (
                    <span style={{
                      fontSize: 12, padding: '4px 12px', borderRadius: 999,
                      background: 'rgba(253,230,138,0.10)', border: '1px solid rgba(253,230,138,0.30)',
                      color: 'var(--role-finance-dark)', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}
                      title={cr.declaration ?? ''}
                    >
                      ⚡ AI Declarat · {cr.declarationCode}
                    </span>
                  )}
                  {declarationType === 'AI' && !cr?.declarationCode && (
                    <span style={{
                      fontSize: 12, padding: '4px 12px', borderRadius: 999,
                      background: 'rgba(253,230,138,0.06)', border: '1px solid rgba(253,230,138,0.15)',
                      color: 'rgba(253,230,138,0.5)', fontWeight: 500,
                    }}>
                      ⚡ AI · fără declarație formală
                    </span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                Specifica cine a creat piesa si daca a fost implicat AI in productie.
              </p>

              <form action={declareCreativeRecordAction} style={{ display: 'grid', gap: 20 }}>
                <input type="hidden" name="trackId" value={id} />

                {/* Echipa creativa */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Echipa creativa
                  </div>
                  {composers.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      {composers.map((c) => (
                        <span key={c.id} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                          {c.name}{c.specialization ? ` · ${c.specialization}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Compozitie melodica</label>
                      <input type="text" name="rolesCompozitie" defaultValue={cr?.rolesCompozitie ?? ''} placeholder="Nume separate prin virgula" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Versuri</label>
                      <input type="text" name="rolesVersuri" defaultValue={cr?.rolesVersuri ?? ''} placeholder="Autori versuri" className="form-input" />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Productie</label>
                      <input type="text" name="rolesProductie" defaultValue={cr?.rolesProductie ?? ''} placeholder="Producatori, beat makers" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mixaj &amp; Mastering</label>
                      <input type="text" name="rolesMixaj" defaultValue={cr?.rolesMixaj ?? ''} placeholder="Sound engineers, mixeri" className="form-input" />
                    </div>
                  </div>
                </div>

                {/* AI usage */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Utilizare AI
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { name: 'aiCompozitie', label: 'Compozitie melodica', checked: cr?.aiCompozitie ?? false },
                      { name: 'aiVersuri',    label: 'Versuri / Lyrics',    checked: cr?.aiVersuri    ?? false },
                      { name: 'aiVoce',       label: 'Voce sintetizata',    checked: cr?.aiVoce       ?? false },
                      { name: 'aiProductie',  label: 'Productie / Beat',    checked: cr?.aiProductie  ?? false },
                    ].map(({ name, label, checked }) => (
                      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', background: 'var(--bg-secondary)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" name={name} defaultChecked={checked} style={{ width: 15, height: 15, accentColor: 'var(--primary)', flexShrink: 0 }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <input type="text" name="aiAltele" defaultValue={cr?.aiAltele ?? ''} placeholder="Alte utilizari AI (optional)" className="form-input" style={{ fontSize: 13 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                  <button type="submit" className="btn btn-primary btn-sm">Salveaza declaratia</button>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Fara AI bifat → certificat Human Made generat automat
                  </span>
                </div>
              </form>
            </section>
          )}

          {/* Versuri */}
          {track.lyrics && (
            <section className="card">
              <h3 style={{ marginBottom: 14 }}>Versuri</h3>
              <pre style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>
                {track.lyrics}
              </pre>
            </section>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Metadata */}
          <section className="card">
            <h3 style={{ marginBottom: 14, fontSize: 14 }}>Informatii tehnice</h3>
            <dl style={{ display: 'grid', gap: 8 }}>
              {[
                { label: 'Tip',           value: TYPE_LABELS[track.type] ?? track.type },
                { label: 'Gen',           value: track.genre },
                { label: 'Subgen',        value: track.subgenre },
                { label: 'ISRC',          value: track.isrc },
                { label: 'BPM',           value: track.bpm?.toString() },
                { label: 'Tonalitate',    value: track.key },
                { label: 'Durata',        value: track.duration ? formatDuration(track.duration) : null },
                { label: 'Data lansarii', value: track.releaseDate },
                { label: 'Album',         value: track.album?.title },
              ].filter(({ value }) => value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <dt style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{label}</dt>
                  <dd style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Venituri */}
          {track.revenues.length > 0 && (
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14 }}>Venituri</h3>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--role-finance-dark)' }}>{totalRevenue.toFixed(0)} €</span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {track.revenues.slice(-5).map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{r.period} · {r.source}</span>
                    <strong>{r.amount.toFixed(0)} €</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lansare */}
          {canWrite && track.status !== 'RELEASED' && (
            <section className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Lansare</h3>
              {track.releases[0] ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-light)', marginBottom: 10 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Dată planificată</span>
                    <strong>{track.releases[0].releaseDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-light)', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Status</span>
                    <strong>{track.releases[0].status === 'RELEASED' ? 'Lansat' : track.releases[0].status === 'READY' ? 'Gata' : 'Planificat'}</strong>
                  </div>
                  <Link href="/releases" className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                    Gestionează lansarea
                  </Link>
                </div>
              ) : (
                <form action={createReleaseAction}>
                  <input type="hidden" name="trackId" value={id} />
                  <input type="hidden" name="returnTo" value={`/catalog/${id}?success=release_created`} />
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Dată lansare *</label>
                    <input name="releaseDate" type="date" className="form-input" required style={{ fontSize: 13 }} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    Planifică lansare
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Fingerprint audio */}
          {canFP && (
            <section className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Fingerprint audio</h3>
              {!track.audioFile ? (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Adauga un fisier audio pentru a calcula amprenta ML.
                </p>
              ) : !track.fingerprint ? (
                <>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Amprenta nu a fost calculata inca. Necesara pentru detectia similitudinii AI.
                  </p>
                  <form action={computeFingerprintFromCatalogPage}>
                    <input type="hidden" name="trackId" value={id} />
                    <button type="submit" className="btn btn-secondary btn-sm">Calculeaza amprenta</button>
                  </form>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    {[
                      { label: 'Tempo',       value: `${track.fingerprint.tempo.toFixed(1)} BPM` },
                      { label: 'Durata',      value: formatDuration(Math.round(track.fingerprint.duration)) },
                      { label: 'Sample rate', value: `${track.fingerprint.sampleRate} Hz` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                    Calculat la {new Date(track.fingerprint.computedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <form action={computeFingerprintFromCatalogPage}>
                      <input type="hidden" name="trackId" value={id} />
                      <button type="submit" className="btn btn-secondary btn-sm">Recalculeaza</button>
                    </form>
                    <form action={deleteFingerprintForTrack}>
                      <input type="hidden" name="trackId" value={id} />
                      <button type="submit" className="btn btn-secondary btn-sm" style={{ color: 'var(--role-artist-dark)' }}>Sterge</button>
                    </form>
                  </div>
                </>
              )}
            </section>
          )}

        </div>
      </div>
    </AppShell>
  )
}
