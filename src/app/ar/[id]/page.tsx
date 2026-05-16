import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { DeleteProspectButton } from '@/components/delete-prospect-button'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canUseScouting, canManageContracts } from '@/lib/roles'
import { updateProspectAction, moveProspectAction, signAndOnboardArtistAction } from '@/app/actions/ar'
import { generateProspectAIScoreAction } from '@/app/actions/ai'

const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED:  'Identificat',
  ANALYZING:   'În analiză',
  CONTACTED:   'Contactat',
  NEGOTIATION: 'Negociere',
  SIGNED:      'Semnat',
  REJECTED:    'Respins',
}

const STATUS_ORDER = ['IDENTIFIED', 'ANALYZING', 'CONTACTED', 'NEGOTIATION', 'SIGNED', 'REJECTED']

type Props = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}

export default async function ProspectDetailPage({ params, searchParams }: Props) {
  const session = await requireSession()
  if (!session.labelId || !canUseScouting(session.role)) redirect('/dashboard')

  const { id }    = await params
  const { error, saved } = await searchParams

  const prospect = await prisma.aRProspect.findUnique({ where: { id } })
  if (!prospect || prospect.labelId !== session.labelId) notFound()

  const canOnboard = canManageContracts(session.role)

  const currentIdx = STATUS_ORDER.indexOf(prospect.status)
  const prevStatus = STATUS_ORDER[currentIdx - 1]
  const nextStatus = STATUS_ORDER[currentIdx + 1]

  const score = prospect.aiScore
  const scoreColor = score == null ? null
    : score >= 70 ? { bg: 'var(--role-ar-light)',      fg: 'var(--role-ar-dark)' }
    : score >= 40 ? { bg: 'var(--role-finance-light)', fg: 'var(--role-finance-dark)' }
    : { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)' }

  const scoreLabel = score == null ? null
    : score >= 70 ? 'Potențial ridicat'
    : score >= 40 ? 'Potențial mediu'
    : 'Potențial scăzut'

  return (
    <AppShell session={session} title={prospect.name}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/ar" className="btn btn-secondary">← Înapoi la pipeline</Link>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(error.replace(/\+/g, ' '))}</p>
        </div>
      )}
      {saved && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #166534', padding: '12px 16px' }}>
          <p style={{ color: '#166534', margin: 0 }}>Modificările au fost salvate.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Coloana stânga: editare */}
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card">
            <h3 style={{ marginBottom: 16 }}>Editează prospect</h3>
            <form action={updateProspectAction}>
              <input type="hidden" name="id" value={prospect.id} />
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nume artist *</label>
                  <input name="name" className="form-input" defaultValue={prospect.name} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Instagram</label>
                  <input name="instagram" className="form-input" defaultValue={prospect.instagram ?? ''} placeholder="@username" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Spotify URL</label>
                  <input name="spotifyUrl" className="form-input" defaultValue={prospect.spotifyUrl ?? ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">YouTube URL</label>
                  <input name="youtubeUrl" className="form-input" defaultValue={prospect.youtubeUrl ?? ''} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">TikTok</label>
                  <input name="tiktok" className="form-input" defaultValue={prospect.tiktok ?? ''} placeholder="@username" />
                </div>
                <div className="form-group">
                  <label className="form-label">SoundCloud URL</label>
                  <input name="soundcloudUrl" className="form-input" defaultValue={prospect.soundcloudUrl ?? ''} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea
                  name="notes"
                  className="form-input form-textarea"
                  rows={6}
                  defaultValue={prospect.notes ?? ''}
                  placeholder="Observații, contacte, impresii..."
                />
              </div>
              <button className="btn btn-primary" type="submit">Salvează modificările</button>
            </form>
          </section>

          {/* Zona periculoasă */}
          <section className="card">
            <h4 style={{ marginBottom: 12, color: 'var(--status-expired)' }}>Zonă periculoasă</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Ștergerea este permanentă și nu poate fi anulată.
            </p>
            <DeleteProspectButton id={prospect.id} />
          </section>
        </div>

        {/* Coloana dreapta: pipeline + AI + meta */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Pipeline */}
          <section className="card">
            <h4 style={{ marginBottom: 12 }}>Etapă în pipeline</h4>
            <div style={{ marginBottom: 14 }}>
              <span style={{
                fontSize: 13, fontWeight: 600, padding: '4px 14px', borderRadius: 20,
                background: 'var(--role-ar-light)', color: 'var(--role-ar-dark)',
              }}>
                {STATUS_LABELS[prospect.status] ?? prospect.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {prevStatus && (
                <form action={moveProspectAction}>
                  <input type="hidden" name="id" value={prospect.id} />
                  <input type="hidden" name="status" value={prevStatus} />
                  <input type="hidden" name="returnUrl" value={`/ar/${prospect.id}`} />
                  <button className="btn btn-sm btn-secondary" type="submit">
                    ← {STATUS_LABELS[prevStatus]}
                  </button>
                </form>
              )}
              {nextStatus && (
                <form action={moveProspectAction}>
                  <input type="hidden" name="id" value={prospect.id} />
                  <input type="hidden" name="status" value={nextStatus} />
                  <input type="hidden" name="returnUrl" value={`/ar/${prospect.id}`} />
                  <button className="btn btn-sm btn-primary" type="submit">
                    {STATUS_LABELS[nextStatus]} →
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Onboarding — doar când e semnat și utilizatorul poate gestiona contracte */}
          {prospect.status === 'SIGNED' && canOnboard && (
            <section className="card" style={{ borderLeft: '3px solid #6ee7b7' }}>
              <h4 style={{ marginBottom: 4, color: '#6ee7b7' }}>✓ Creează artist + contract</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Adaugă artistul în catalog și creează contractul activ.
              </p>
              <form action={signAndOnboardArtistAction}>
                <input type="hidden" name="prospectId" value={prospect.id} />
                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Gen muzical *</label>
                    <input name="genre" className="form-input" required placeholder="ex: Pop, Hip-Hop" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Royalty % *</label>
                    <input name="royaltyPercent" className="form-input" type="number" min="0" max="100" step="0.1" required placeholder="ex: 15" />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Durată contract *</label>
                    <input name="duration" className="form-input" required placeholder="ex: 3 ani" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data semnării</label>
                    <input name="startDate" className="form-input" type="date" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Creează artist + contract →
                </button>
              </form>
            </section>
          )}

          {/* Scor AI */}
          <section className="card">
            <h4 style={{ marginBottom: 12 }}>Scor AI</h4>
            {score != null ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: scoreColor?.fg }}>
                    {score}
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>/100</span>
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                    background: scoreColor?.bg, color: scoreColor?.fg,
                  }}>
                    {scoreLabel}
                  </span>
                </div>

                {/* Bară de progres */}
                <div style={{ background: 'var(--border-light)', borderRadius: 4, height: 8, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${score}%`,
                    background: score >= 80 ? '#22d3ee' : score < 50 ? '#ff7b7b' : '#facc15',
                    boxShadow: score >= 80
                      ? '0 0 10px rgba(34,211,238,0.7), 0 0 20px rgba(34,211,238,0.4)'
                      : score < 50
                      ? '0 0 10px rgba(255,123,123,0.7), 0 0 20px rgba(255,123,123,0.4)'
                      : '0 0 10px rgba(250,204,21,0.6), 0 0 18px rgba(250,204,21,0.35)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>

                {prospect.aiReport && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
                    {prospect.aiReport}
                  </p>
                )}

                <form action={generateProspectAIScoreAction}>
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="returnUrl" value={`/ar/${prospect.id}`} />
                  <button className="btn btn-sm btn-secondary" type="submit">↻ Regenerează scor</button>
                </form>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Scorul AI nu a fost generat încă.
                </p>
                <form action={generateProspectAIScoreAction}>
                  <input type="hidden" name="prospectId" value={prospect.id} />
                  <input type="hidden" name="returnUrl" value={`/ar/${prospect.id}`} />
                  <button className="btn btn-primary" type="submit">✦ Analizează cu AI</button>
                </form>
              </div>
            )}
          </section>

          {/* Link-uri */}
          {(prospect.spotifyUrl || prospect.youtubeUrl || prospect.instagram || prospect.tiktok || prospect.soundcloudUrl) && (
            <section className="card">
              <h4 style={{ marginBottom: 10 }}>Link-uri</h4>
              <div style={{ display: 'grid', gap: 6 }}>
                {prospect.spotifyUrl    && <a href={prospect.spotifyUrl}    target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>🎵 Spotify</a>}
                {prospect.youtubeUrl    && <a href={prospect.youtubeUrl}    target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>▶ YouTube</a>}
                {prospect.instagram     && <a href={`https://instagram.com/${prospect.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>📷 {prospect.instagram}</a>}
                {prospect.tiktok        && <a href={`https://tiktok.com/@${prospect.tiktok.replace('@','')}`}     target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>🎵 TikTok: {prospect.tiktok}</a>}
                {prospect.soundcloudUrl && <a href={prospect.soundcloudUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--primary)' }}>☁ SoundCloud</a>}
              </div>
            </section>
          )}

          {/* Meta */}
          <section className="card">
            <h4 style={{ marginBottom: 10 }}>Informații</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Adăugat: {new Date(prospect.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Ultima modificare: {new Date(prospect.updatedAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
