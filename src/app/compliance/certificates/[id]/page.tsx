import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canViewCompliance } from '@/lib/roles'
import { PrintButton } from './print-button'

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance/certificates')

  const { id } = await params

  const cert = await prisma.humanMadeCertificate.findUnique({
    where: { id },
    include: {
      track: { include: { artist: true } },
      label: true,
    },
  })

  if (!cert || cert.labelId !== session.labelId) notFound()

  // Emitentul nu e relație Prisma — query separat
  const issuer = await prisma.user.findUnique({
    where: { id: cert.issuedById },
    select: { firstName: true, lastName: true, email: true },
  })

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

  const issuedDate = fmtDate(cert.issuedAt)
  const revokedDate = cert.revokedAt ? fmtDate(cert.revokedAt) : null

  const issuerName = issuer
    ? `${issuer.firstName} ${issuer.lastName}`.trim() || issuer.email
    : 'Necunoscut'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>

      {/* Bară navigare — ascunsă la print */}
      <div className="no-print" style={{ width: '100%', maxWidth: 740, marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          href="/compliance/certificates"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
            background: '#fff', color: '#333',
            border: '1px solid #ddd',
          }}
        >
          ← Înapoi la certificate
        </Link>
        <PrintButton />
      </div>

      {/* ── Documentul certificat ───────────────────────────────────────────── */}
      <div id="certificate" style={{
        width: '100%',
        maxWidth: 740,
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 4,
        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Bordură decorativă superioară */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #1a3a1a, #2e7d32, #1a3a1a)' }} />

        {/* Corp certificat */}
        <div style={{ padding: '52px 64px' }}>

          {/* Antet */}
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 13, letterSpacing: 5, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'system-ui, sans-serif' }}>
              {cert.label.name}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: '#aaa', textTransform: 'uppercase', marginBottom: 20, fontFamily: 'system-ui, sans-serif' }}>
              Certificat de Autenticitate · SoundLedger
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 400, color: '#111', margin: '0 0 4px', letterSpacing: 2, textTransform: 'uppercase' }}>
              Human Made
            </h1>
            <div style={{ width: 60, height: 2, background: '#2e7d32', margin: '12px auto 0' }} />
          </div>

          {/* Text introductiv */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 2, margin: 0, fontStyle: 'italic' }}>
              Prin prezentul document se atestă că opera muzicală
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '10px 0 6px', fontFamily: 'system-ui, sans-serif' }}>
              „{cert.track.title}"
            </h2>
            <p style={{ fontSize: 16, color: '#2e7d32', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
              de {cert.track.artist.name}
            </p>
          </div>

          {/* Declarație */}
          <div style={{
            margin: '0 0 36px',
            padding: '24px 32px',
            background: '#f9f9f7',
            borderLeft: '3px solid #2e7d32',
            borderRadius: 2,
          }}>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.9, margin: 0, fontStyle: 'italic' }}>
              {cert.declaration}
            </p>
          </div>

          {/* Grilă detalii */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 36 }}>
            {[
              { label: 'Cod certificat', value: cert.certificateCode, mono: true },
              { label: 'Data emiterii',  value: issuedDate },
              { label: 'Label muzical',  value: cert.label.name },
              { label: 'Emis de',        value: issuerName },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 5, fontFamily: 'system-ui, sans-serif' }}>
                  {label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111', fontFamily: mono ? 'monospace' : 'system-ui, sans-serif' }}>
                  {value}
                </div>
              </div>
            ))}

            {/* Status — full width */}
            <div style={{ gridColumn: '1 / -1', padding: '16px 20px', background: cert.isRevoked ? '#fff8f8' : '#f7fff7' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: '#2e7d32', textTransform: 'uppercase', marginBottom: 5, fontFamily: 'system-ui, sans-serif' }}>
                Status
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: cert.isRevoked ? '#c62828' : '#2e7d32', fontFamily: 'system-ui, sans-serif' }}>
                {cert.isRevoked ? '⚠ REVOCAT' : '✓ VALID — Certificat activ'}
              </div>
              {cert.isRevoked && revokedDate && (
                <div style={{ fontSize: 13, color: '#c62828', marginTop: 4, fontFamily: 'system-ui, sans-serif' }}>
                  Revocat la {revokedDate}{cert.revokedReason ? ` — ${cert.revokedReason}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Sigiliu / Footer documentar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 28, borderTop: '1px solid #e0e0e0' }}>
            <div>
              <div style={{ fontSize: 10, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'system-ui, sans-serif' }}>
                Emis prin platforma
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', fontFamily: 'system-ui, sans-serif' }}>
                SoundLedger
              </div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2, fontFamily: 'system-ui, sans-serif' }}>
                Protecția drepturilor artiștilor în era AI
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#bbb', fontFamily: 'system-ui, sans-serif', marginBottom: 2 }}>
                Cod unic de verificare
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#2e7d32', letterSpacing: 1 }}>
                {cert.certificateCode}
              </div>
            </div>
          </div>
        </div>

        {/* Bordură decorativă inferioară */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #1a3a1a, #2e7d32, #1a3a1a)' }} />
      </div>

      {/* CSS print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          #certificate {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
