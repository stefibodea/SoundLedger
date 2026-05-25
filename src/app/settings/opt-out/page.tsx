import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageOptOut } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { issueOptOutDeclarationAction, revokeOptOutDeclarationAction } from '@/app/actions/compliance-ai'
import { PrintButton } from '../print-button'

type PageProps = {
  searchParams: Promise<{ success?: string; revoked?: string; error?: string }>
}

export default async function OptOutSettingsPage({ searchParams }: PageProps) {
  const session = await requireSession()
  await enforceOnboarding(session, '/settings/opt-out')
  if (!session.labelId || !canManageOptOut(session.role)) redirect('/dashboard')

  const sp = await searchParams

  const [declaration, label, tracksCount] = await Promise.all([
    prisma.aIOptOutDeclaration.findUnique({ where: { labelId: session.labelId } }),
    prisma.label.findUnique({ where: { id: session.labelId }, select: { name: true, country: true } }),
    prisma.track.count({ where: { labelId: session.labelId } }),
  ])

  const isActive   = declaration && !declaration.isRevoked
  const canManage  = canManageOptOut(session.role)
  const issuedDate = declaration
    ? new Date(declaration.issuedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <AppShell session={session} title="Declarație Opt-Out AI">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-doc { background: white !important; color: black !important; border: 1px solid #ccc !important; }
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
          Înapoi la dashboard
        </Link>
      </div>

      {sp.success === '1' && (
        <div className="card no-print" style={{ marginBottom: 16, borderLeft: '3px solid #4ade80', padding: '12px 16px', background: 'rgba(74,222,128,0.06)' }}>
          <p style={{ color: '#4ade80', margin: 0, fontWeight: 500 }}>Declarația de Opt-Out a fost emisă cu succes și este acum activă.</p>
        </div>
      )}
      {sp.revoked === '1' && (
        <div className="card no-print" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-finance-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-finance-dark)', margin: 0 }}>Declarația a fost revocată.</p>
        </div>
      )}
      {sp.error && (
        <div className="card no-print" style={{ marginBottom: 16, borderLeft: '3px solid var(--role-artist-dark)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(sp.error)}</p>
        </div>
      )}

      {/* Status banner */}
      <div className="card no-print" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>
            {isActive ? 'Opt-Out activ' : declaration?.isRevoked ? 'Opt-Out revocat' : 'Nicio declarație emisă'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {isActive
              ? `Cod: ${declaration.declarationCode} · Emis: ${issuedDate} · Acoperă ${tracksCount} piese`
              : declaration?.isRevoked
              ? `Revocat pe ${new Date(declaration.revokedAt!).toLocaleDateString('ro-RO')}${declaration.revokedReason ? ` — ${declaration.revokedReason}` : ''}`
              : 'Catalogul tău nu este protejat împotriva antrenării AI. Emite o declarație de Opt-Out.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isActive && <PrintButton />}
          {isActive && canManage && (
            <form action={revokeOptOutDeclarationAction}>
              <button type="submit" className="btn btn-ghost btn-sm" style={{ color: 'var(--role-artist-dark)', fontSize: 12 }}>
                Revocă declarația
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Documentul formal */}
      {isActive && declaration ? (
        <div className="card print-doc" style={{ marginBottom: 20, padding: '32px 40px', maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Declarație oficială · {declaration.declarationCode}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
              Declarație de Opt-Out privind utilizarea muzicii în sisteme de Inteligență Artificială
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              Emisă conform EU AI Act, Art. 4(3) și Directivei UE 2019/790 privind drepturile de autor
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16, fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <p>
              Subsemnata casă de discuri <strong style={{ color: 'var(--text-primary)' }}>{label?.name}</strong>,
              cu sediul în <strong style={{ color: 'var(--text-primary)' }}>{label?.country}</strong>,
              prin prezenta declarație, exercită în mod explicit dreptul de <strong style={{ color: 'var(--text-primary)' }}>opt-out</strong> față
              de orice utilizare a operelor muzicale din catalogul său în scopul antrenării, ajustării sau evaluării
              sistemelor de Inteligență Artificială, inclusiv modele de tip text-to-music, music generation și sisteme similare.
            </p>
            <p>
              Această declarație acoperă <strong style={{ color: 'var(--text-primary)' }}>întregul catalog</strong> al casei
              de discuri, compus din <strong style={{ color: 'var(--text-primary)' }}>{tracksCount} înregistrări muzicale</strong>,
              inclusiv piesele adăugate ulterior datei prezentei declarații.
            </p>
            <p>
              Orice utilizare a operelor protejate din catalogul nostru în scop de antrenament AI, fără obținerea prealabilă
              a unei licențe explicite și a unui acord de remunerare echitabilă, constituie o încălcare a drepturilor de autor
              și va face obiectul unor demersuri juridice, inclusiv solicitarea de daune în temeiul legislației europene și naționale aplicabile.
            </p>
            {declaration.notes && (
              <p style={{ borderLeft: '3px solid rgba(155,148,240,0.4)', paddingLeft: 14, color: 'var(--text-primary)' }}>
                <em>Note suplimentare:</em> {declaration.notes}
              </p>
            )}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 13 }}>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emitent</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label?.name}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data emiterii</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{issuedDate}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cod referință</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{declaration.declarationCode}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temei legal</div>
                <div style={{ color: 'var(--text-primary)' }}>{declaration.legalBasis}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        canManage && (
          <div className="card no-print" style={{ maxWidth: 600, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px' }}>Emite declarație de Opt-Out</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Declarația va acoperi automat toate cele <strong>{tracksCount}</strong> piese din catalogul tău
              și va genera un document formal cu forță juridică în UE.
            </p>
            <form action={issueOptOutDeclarationAction} style={{ display: 'grid', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="notes">Note suplimentare (opțional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  className="form-input"
                  rows={3}
                  placeholder="ex: Catalogul include piese sub licențe exclusive cu artiști din România..."
                  style={{ resize: 'none' }}
                />
              </div>
              <button type="submit" style={{
                background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
                color: 'white', border: 'none', padding: '10px 20px',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                Emite declarație Opt-Out
              </button>
            </form>
          </div>
        )
      )}

      {/* Info box */}
      <div className="card no-print" style={{ background: 'rgba(155,148,240,0.05)', border: '1px solid rgba(155,148,240,0.15)' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Ce înseamnă această declarație?</h4>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>Conform <strong style={{ color: 'var(--text-primary)' }}>EU AI Act Art. 4(3)</strong>, titularii de drepturi pot interzice explicit utilizarea operelor lor pentru antrenament AI</li>
          <li>Declarația reprezintă dovada formală a acestui opt-out și poate fi utilizată în litigii sau notificări oficiale</li>
          <li>Nu împiedică platformele să ignore declarația — dar creează un <strong style={{ color: 'var(--text-primary)' }}>precedent juridic</strong> în favoarea ta</li>
          <li>Pentru protecție maximă, trimite documentul descărcat direct companiilor AI și OGC-urilor (UCMR-ADA, UPFR)</li>
        </ul>
      </div>
    </AppShell>
  )
}
