import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge, contractStatusVariant } from '@/components/ui/StatusBadge'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewContracts, canManageContracts } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { ContractPrintButton } from './contract-print-button'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:      'Activ',
  EXPIRING:    'Expiră curând',
  EXPIRED:     'Expirat',
  NEGOTIATION: 'În negociere',
}

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      padding: '16px 20px',
      background: 'var(--bg-tertiary)',
      borderRadius: 10,
      border: '1px solid var(--border-light)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: accent ? 'var(--primary)' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/contracts')
  if (!session.labelId || !canViewContracts(session.role)) redirect('/dashboard')

  const { id } = await params

  const contract = await prisma.contract.findFirst({
    where: { id, labelId: session.labelId },
    include: { artist: true },
  })
  if (!contract) notFound()

  const canManage = canManageContracts(session.role)

  const territories = Array.isArray(contract.territories) ? contract.territories as string[] : []
  const rights      = Array.isArray(contract.rights)      ? contract.rights      as string[] : []

  const manualClauses = contract.specialClauses
    ? contract.specialClauses.includes('--- CLAUZE AI COMPLIANCE')
      ? contract.specialClauses.split('\n\n--- CLAUZE AI COMPLIANCE')[0].trim()
      : contract.specialClauses.trim()
    : null


  return (
    <AppShell
      session={session}
      title={`Contract ${contract.artist.name}`}
      subtitle={`${STATUS_LABELS[contract.status] ?? contract.status} • ${contract.duration}`}
    >
      <style>{`
        @media print {
          :root {
            --bg-primary: #ffffff !important;
            --bg-secondary: #f8f8f8 !important;
            --bg-tertiary: #f0f0f0 !important;
            --text-primary: #111111 !important;
            --text-secondary: #555555 !important;
            --text-tertiary: #888888 !important;
            --primary: #6b5ce7 !important;
            --border-light: rgba(0,0,0,0.12) !important;
            --border-medium: rgba(0,0,0,0.18) !important;
          }
          html, body { background: #fff !important; color: #111 !important; }
          header, nav, aside { display: none !important; }
          .no-print { display: none !important; }
          div[style*="paddingTop"] { padding-top: 0 !important; }
          main { padding: 20px !important; max-width: 100% !important; margin: 0 !important; }
          .page-header { margin-bottom: 16px !important; }
          .card {
            background: #fff !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .badge {
            background: #f0f0f0 !important;
            color: #333 !important;
            border: 1px solid #ccc !important;
          }
          a { color: #6b5ce7 !important; }
        }
      `}</style>

      {/* Înapoi + Print */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/contracts" className="btn btn-ghost btn-sm no-print">
          Înapoi la contracte
        </Link>
        <ContractPrintButton />
      </div>

      {/* ── SECȚIUNEA 1 — HEADER ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

          {/* Stânga — artist */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar name={contract.artist.name} imageUrl={contract.artist.photo} size={150} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {contract.artist.name}
              </div>
              {contract.artist.realName && (
                <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {contract.artist.realName}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <StatusBadge
                  label={STATUS_LABELS[contract.status] ?? contract.status}
                  variant={contractStatusVariant(contract.status)}
                />
              </div>
            </div>
          </div>

          {/* Dreapta — metrici + buton editare */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
            {canManage && (
              <Link href={`/contracts/${contract.id}/edit`} className="btn btn-secondary btn-sm no-print" style={{ fontSize: 13 }}>
                Editează contractul
              </Link>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MetricBox label="Royalty" value={`${contract.royaltyPercent}%`} accent />
              <MetricBox label="Avans" value={contract.advance ? `${Number(contract.advance).toLocaleString('ro-RO')} €` : '—'} />
              <MetricBox label="Durată" value={contract.duration} />
              <MetricBox label="Perioadă" value={`${contract.startDate ?? '—'} ${contract.endDate ?? '—'}`} />
            </div>
          </div>

        </div>
      </div>

      {/* ── SECȚIUNEA 2 — DETALII ────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Detalii contract</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Semnat la</div>
            <div style={{ fontSize: 14 }}>{fmtDate(contract.signedAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Creat</div>
            <div style={{ fontSize: 14 }}>{fmtDate(contract.createdAt)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Status</div>
            <StatusBadge
              label={STATUS_LABELS[contract.status] ?? contract.status}
              variant={contractStatusVariant(contract.status)}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Document</div>
            {contract.documentUrl ? (
              <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 14, color: 'var(--primary)', textDecoration: 'none' }}>
                Vezi document
              </a>
            ) : (
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>—</span>
            )}
          </div>
        </div>

        {territories.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Teritorii</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {territories.map((t, i) => (
                <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  {String(t)}
                </span>
              ))}
            </div>
          </div>
        )}

        {rights.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Drepturi</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rights.map((r, i) => (
                <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                  {String(r)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECȚIUNEA 3 — CLAUZE SPECIALE ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Clauze speciale</h3>
        {manualClauses ? (
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
            {manualClauses}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Nicio clauză specială adăugată.
          </p>
        )}
      </div>


    </AppShell>
  )
}
