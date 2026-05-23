import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { getArtistProfile } from '@/lib/artist-profile'
import { requestContractRenegotiationAction } from '@/app/actions/artist-requests'
import { generateArtistContractExplanationAction } from '@/app/actions/ai'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:       { bg: 'var(--bg-tertiary)',         color: 'var(--text-secondary)',    label: 'Draft' },
  ACTIVE:      { bg: 'var(--role-ar-light)',        color: 'var(--role-ar-dark)',      label: 'Activ' },
  EXPIRING:    { bg: 'var(--role-finance-light)',   color: 'var(--role-finance-dark)', label: 'Expiră curând' },
  EXPIRED:     { bg: 'var(--role-artist-light)',    color: 'var(--role-artist-dark)',  label: 'Expirat' },
  NEGOTIATION: { bg: 'var(--role-label-light)',     color: 'var(--role-label-dark)',   label: 'În negociere' },
}

const EXPLANATION_COLORS: Record<string, string> = {
  'CE ÎNSEAMNĂ PENTRU TINE': 'var(--role-ar-dark)',
  'ATENȚIE': 'var(--role-finance-dark)',
  'SFAT': 'var(--primary)',
}

function ContractExplanation({ explanation }: { explanation: { message: string; createdAt: Date } }) {
  const sections = explanation.message.split(/\*\*([^*]+)\*\*/).filter(Boolean)
  const pairs: { title: string; body: string }[] = []
  for (let i = 0; i + 1 < sections.length; i += 2) {
    pairs.push({ title: sections[i].trim(), body: sections[i + 1].trim() })
  }
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)', display: 'grid', gap: 14 }}>
      {pairs.length > 0 ? pairs.map(({ title, body }) => (
        <div key={title}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: EXPLANATION_COLORS[title] ?? 'var(--text-tertiary)', marginBottom: 6 }}>
            {title}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
      )) : (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{explanation.message}</p>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        Generat la {new Date(explanation.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

function RoyaltyGauge({ percent }: { percent: number }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const filled = (percent / 100) * circ
  const gap = circ - filled
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="9" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="var(--role-ar-dark)" strokeWidth="9"
        strokeDasharray={`${filled} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fill="var(--role-ar-dark)" fontSize="19" fontWeight="700" fontFamily="inherit">
        {percent}%
      </text>
      <text x="50" y="62" textAnchor="middle" fill="var(--text-tertiary)" fontSize="10" fontFamily="inherit">
        royalty
      </text>
    </svg>
  )
}

export default async function MyContractPage({ searchParams }: PageProps) {
  const session = await requireSession()
  if (session.role !== ROLES.ARTIST) redirect('/dashboard')

  const params = (await searchParams) ?? {}
  const success = typeof params.success === 'string' ? params.success : null
  const error   = typeof params.error   === 'string' ? params.error   : null

  const artist = await getArtistProfile(session)

  if (!artist) {
    return (
      <AppShell session={session} title="Contractul meu">
        <div className="card empty-state">
          <div className="empty-icon">📄</div>
          <p>Contul tău nu este legat de un profil de artist.</p>
        </div>
      </AppShell>
    )
  }

  const [contracts, latestExplanation] = await Promise.all([
    prisma.contract.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findFirst({
      where: { userId: session.userId, type: 'AI_CONTRACT' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const activeContract = contracts.find((c) => c.status === 'ACTIVE' || c.status === 'EXPIRING')
  const pastContracts  = contracts.filter((c) => c.id !== activeContract?.id)

  // Compute days remaining
  let daysLeft: number | null = null
  if (activeContract?.endDate) {
    const today = new Date()
    const end   = new Date(activeContract.endDate)
    daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <AppShell session={session} title="Contractul meu" subtitle="Termenii contractului tău activ">
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

      {!activeContract ? (
        <div className="card empty-state">
          <div className="empty-icon">📄</div>
          <p>Nu există un contract activ momentan.</p>
        </div>
      ) : (
        <>
        <section className="card" style={{ marginBottom: 20 }}>
          {/* EXPIRING warning */}
          {activeContract.status === 'EXPIRING' && (
            <div style={{
              marginBottom: 20,
              padding: '12px 16px',
              background: 'var(--role-finance-light)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--role-finance-dark)',
              fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span>
                Contractul tău expiră curând
                {daysLeft !== null && daysLeft > 0 ? ` — mai sunt ${daysLeft} zile.` : '.'}
                {' '}Ia în considerare solicitarea unei renegocieri.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3>Contract activ</h3>
            <span className="badge" style={{
              background: STATUS_STYLES[activeContract.status]?.bg ?? 'var(--bg-tertiary)',
              color:      STATUS_STYLES[activeContract.status]?.color ?? 'var(--text-secondary)',
              fontSize: 13, padding: '6px 14px',
            }}>
              {STATUS_STYLES[activeContract.status]?.label ?? activeContract.status}
            </span>
          </div>

          {/* Key metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 24, marginBottom: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <RoyaltyGauge percent={activeContract.royaltyPercent} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {activeContract.advance != null && (
                <div className="card" style={{ padding: '14px 16px', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Avans</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{activeContract.advance} €</div>
                </div>
              )}
              <div className="card" style={{ padding: '14px 16px', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Durată</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{activeContract.duration}</div>
              </div>
              {daysLeft !== null && (
                <div className="card" style={{
                  padding: '14px 16px',
                  background: daysLeft <= 30 ? 'var(--role-finance-light)' : 'var(--bg-secondary)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Zile rămase</div>
                  <div style={{
                    fontSize: 22, fontWeight: 700,
                    color: daysLeft <= 30 ? 'var(--role-finance-dark)' : daysLeft <= 0 ? 'var(--role-artist-dark)' : 'inherit',
                  }}>
                    {daysLeft > 0 ? daysLeft : 'Expirat'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            {(activeContract.startDate || activeContract.endDate) && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Perioadă</div>
                <div>{activeContract.startDate ?? '—'} → {activeContract.endDate ?? '—'}</div>
              </div>
            )}
            {activeContract.territories && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Teritorii</div>
                <div>{activeContract.territories}</div>
              </div>
            )}
            {activeContract.rights && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Drepturi</div>
                <div>{activeContract.rights}</div>
              </div>
            )}
            {activeContract.specialClauses && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Clauze speciale</div>
                <div style={{ color: 'var(--text-secondary)' }}>{activeContract.specialClauses}</div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Dorești să renegociezi termenii contractului?
            </p>
            <form action={requestContractRenegotiationAction}>
              <button className="btn btn-secondary" type="submit">Solicită renegociere</button>
            </form>
          </div>
        </section>

        {/* ── AI Contract Explanation ── */}
        <section className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: latestExplanation ? 14 : 0 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>✨ Explică-mi contractul</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                AI analizează clauzele și îți explică ce înseamnă pentru tine, în limbaj simplu.
              </p>
            </div>
            <form action={generateArtistContractExplanationAction} style={{ flexShrink: 0, marginLeft: 16 }}>
              <input type="hidden" name="contractId" value={activeContract.id} />
              <button className="btn btn-secondary btn-sm" type="submit">
                {latestExplanation ? 'Regenerează' : 'Analizează contractul'}
              </button>
            </form>
          </div>
          {latestExplanation && <ContractExplanation explanation={latestExplanation} />}
        </section>
        </>
      )}

      {pastContracts.length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Istoric contracte</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {pastContracts.map((contract) => {
              const s = STATUS_STYLES[contract.status] ?? STATUS_STYLES.DRAFT
              return (
                <div key={contract.id} style={{
                  padding: '12px 14px', border: '1px solid var(--border-light)',
                  borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <strong>{contract.duration}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 12 }}>
                      {contract.royaltyPercent}% royalty
                      {contract.startDate ? ` • ${contract.startDate} → ${contract.endDate ?? '—'}` : ''}
                    </span>
                  </div>
                  <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </AppShell>
  )
}
