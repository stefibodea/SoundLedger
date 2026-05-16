import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance, canViewCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { CertificatesClient, type TrackRow } from './certificates-client'

const DEFAULT_DECLARATION =
  'Certific prin prezenta că această piesă muzicală este 100% creație umană. ' +
  'Niciun element al acestei piese (melodie, versuri, aranjament, producție) nu a fost generat sau asistat de sisteme de inteligență artificială. ' +
  'Toate drepturile de autor aparțin creatorilor umani implicați în realizarea acestei opere.'


export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ issued?: string; revoked?: string; error?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/certificates')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const params  = await searchParams
  const issuedN = params.issued ? Number(params.issued) : null
  const revoked = params.revoked === '1'
  const error   = params.error

  const rawTracks = await prisma.track.findMany({
    where: { labelId: session.labelId },
    include: { artist: true, humanMadeCert: true },
    orderBy: [{ artist: { name: 'asc' } }, { title: 'asc' }],
  })

  const tracks: TrackRow[] = rawTracks.map((t) => ({
    id:     t.id,
    title:  t.title,
    genre:  t.genre,
    status: t.status,
    artist: { id: t.artist.id, name: t.artist.name },
    cert: t.humanMadeCert
      ? {
          id:              t.humanMadeCert.id,
          certificateCode: t.humanMadeCert.certificateCode,
          issuedAt:        t.humanMadeCert.issuedAt.toISOString(),
          isRevoked:       t.humanMadeCert.isRevoked,
        }
      : null,
  }))

  const certified   = tracks.filter((t) => t.cert && !t.cert.isRevoked).length
  const uncertified = tracks.filter((t) => !t.cert || t.cert.isRevoked).length

  return (
    <AppShell
      session={session}
      title="Certificate Human Made"
    >
      {/* Orbs decorativi fundal */}
      <div style={{
        position: 'fixed', top: -100, left: -100, width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(155,148,240,0.08) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: -100, right: -100, width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {issuedN !== null && issuedN > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-ar-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-ar-dark)', margin: 0 }}>
            ✓ {issuedN === 1 ? 'Un certificat emis cu succes!' : `${issuedN} certificate emise cu succes!`}
          </p>
        </div>
      )}
      {revoked && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-finance-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-finance-dark)', margin: 0 }}>Certificatul a fost revocat.</p>
        </div>
      )}
      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>⚠️ {decodeURIComponent(error)}</p>
        </div>
      )}

      {/* KPI Cards — gradient border + glassmorphism */}
      <section className="grid grid-3" style={{ marginBottom: 20 }}>

        {/* Card 1 — Total piese cu dot pulsant */}
        <div className="card card-stat">
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tracks.length}
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#6ee7b7', flexShrink: 0,
              animation: 'livePulse 2s ease infinite',
            }} />
          </div>
          <div className="stat-label">Total piese</div>
          <div style={{
            fontSize: 10, color: 'rgba(110,231,183,0.6)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4,
          }}>
            sistem activ
          </div>
        </div>

        {/* Card 2 — Certificate active */}
        <div className="card card-stat">
          <div className="stat-value" style={{ color: 'var(--role-ar-dark)' }}>{certified}</div>
          <div className="stat-label">Certificate active</div>
        </div>

        {/* Card 3 — Necertificate */}
        <div className="card card-stat">
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{uncertified}</div>
          <div className="stat-label">Necertificate</div>
        </div>

      </section>

      <CertificatesClient
        tracks={tracks}
        canManage={canManageCompliance(session.role)}
        defaultDeclaration={DEFAULT_DECLARATION}
      />
    </AppShell>
  )
}
