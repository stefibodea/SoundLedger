import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewContracts } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { PrintButton } from './print-button'

type PageProps = { params: Promise<{ id: string }> }

const STATUS_LABELS: Record<string, string> = {
  DRAFT:       'Schiță',
  ACTIVE:      'Activ',
  EXPIRING:    'Expiră curând',
  EXPIRED:     'Expirat',
  NEGOTIATION: 'În negociere',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

export default async function ContractPreviewPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireSession()
  await enforceOnboarding(session, `/contracts/${id}/preview`)
  if (!session.labelId || !canViewContracts(session.role)) redirect('/dashboard')

  const [contract, label] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: { artist: { select: { name: true, realName: true, nationality: true, contactEmail: true } } },
    }),
    prisma.label.findUnique({
      where: { id: session.labelId },
      select: { name: true, country: true, city: true },
    }),
  ])

  if (!contract || contract.labelId !== session.labelId) notFound()

  let territories: string[] = []
  let rights: string[] = []
  try { territories = JSON.parse(contract.territories as string) } catch { /* noop */ }
  try { rights      = JSON.parse(contract.rights as string) }      catch { /* noop */ }

  const issuedDate = new Date(contract.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <AppShell session={session} title="Previzualizare contract">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-doc {
            background: white !important; color: black !important;
            border: 1px solid #ccc !important; box-shadow: none !important;
            max-width: 100% !important; padding: 32px !important;
          }
          .print-doc * { color: black !important; border-color: #ccc !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link href={`/artists/${contract.artistId}`} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Înapoi la profil artist
        </Link>
        <PrintButton />
      </div>

      {/* Document formal */}
      <div className="card print-doc" style={{ maxWidth: 780, padding: '48px 56px' }}>

        {/* Antet */}
        <div style={{ textAlign: 'center', marginBottom: 40, paddingBottom: 32, borderBottom: '2px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            Document oficial · {label?.name}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
            Contract de Reprezentare Artistică
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Încheiat la data de {issuedDate}
          </div>
          {contract.signedAt && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Semnat la: {new Date(contract.signedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Părți contractante */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Casă de discuri (Mandatar)
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{label?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label?.city}, {label?.country}</div>
          </div>
          <div style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Artist (Mandant)
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{contract.artist.name}</div>
            {contract.artist.realName && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Numele real: {contract.artist.realName}</div>
            )}
            {contract.artist.nationality && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{contract.artist.nationality}</div>
            )}
            {contract.artist.contactEmail && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contract.artist.contactEmail}</div>
            )}
          </div>
        </div>

        {/* Termeni principali */}
        <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>
          Termeni contractuali
        </h3>
        <div style={{ marginBottom: 28 }}>
          <Row label="Status contract"    value={STATUS_LABELS[contract.status] ?? contract.status} />
          <Row label="Durată"             value={contract.duration} />
          {contract.startDate && <Row label="Data de început" value={contract.startDate} />}
          {contract.endDate   && <Row label="Data de expirare" value={contract.endDate} />}
          <Row label="Procent royalty"    value={`${contract.royaltyPercent}%`} />
          {contract.advance != null && Number(contract.advance) > 0 && (
            <Row label="Avans" value={`${Number(contract.advance).toLocaleString('ro-RO')} €`} />
          )}
        </div>

        {/* Teritorii */}
        {territories.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Teritorii acoperite
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {territories.map((t) => (
                <span key={t} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Drepturi */}
        {rights.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Drepturi transferate
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {rights.map((r) => (
                <span key={r} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(155,148,240,0.08)', border: '1px solid rgba(155,148,240,0.2)', color: '#9B94F0' }}>
                  {r}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Clauze speciale */}
        {contract.specialClauses && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Clauze speciale
            </h3>
            <div style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderRadius: 10, fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 28, whiteSpace: 'pre-wrap' }}>
              {contract.specialClauses}
            </div>
          </>
        )}

        {/* Semnături */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 40 }}>
              Semnătura Casei de Discuri
            </div>
            <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              {label?.name}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 40 }}>
              Semnătura Artistului
            </div>
            <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              {contract.artist.name}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
