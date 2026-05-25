import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { canManageCompliance, canViewCompliance } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { PermissionsSelector } from './permissions-selector'
import { PermissionsForm, type PermData } from './permissions-form'

export default async function CompliancePermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; artist?: string; trackId?: string }>
}) {
  const session = await requireSession()
  await enforceOnboarding(session, '/compliance/permissions')
  if (!session.labelId || !canViewCompliance(session.role)) redirect('/compliance')

  const params    = await searchParams
  const saved     = params.saved === '1'
  const error     = params.error
  const artistId  = params.artist  ?? ''
  const trackId   = params.trackId ?? ''
  const canManage = canManageCompliance(session.role)

  const artists = await prisma.artist.findMany({
    where: { labelId: session.labelId },
    orderBy: { name: 'asc' },
  })

  const artistTracks = artistId
    ? await prisma.track.findMany({
        where: { labelId: session.labelId, artistId },
        include: { aiPermission: true },
        orderBy: { title: 'asc' },
      })
    : []

  const selectedTrack  = trackId ? artistTracks.find((t) => t.id === trackId) ?? null : null
  const rawPerm        = selectedTrack?.aiPermission ?? null
  const selectedArtist = artists.find((a) => a.id === artistId) ?? null

  // Serialize Prisma Dates plain strings for the client component
  const perm: PermData | null = rawPerm
    ? {
        allowAITraining:  rawPerm.allowAITraining,
        allowResearchOnly: rawPerm.allowResearchOnly,
        requiresLicense:  rawPerm.requiresLicense,
        artistConsent:    rawPerm.artistConsent,
        minCompensation:  rawPerm.minCompensation,
        consentDate:      rawPerm.consentDate
          ? new Date(rawPerm.consentDate).toISOString().split('T')[0]
          : null,
        notes:    rawPerm.notes,
        updatedAt: rawPerm.updatedAt.toISOString(),
      }
    : null

  return (
    <AppShell session={session} title=" Permisiuni AI">
      {saved && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-ar-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-ar-dark)', margin: 0 }}>
            Permisiunile pentru <strong>{selectedTrack?.title}</strong> au fost salvate.
          </p>
        </div>
      )}
      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-artist-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-artist-dark)', margin: 0 }}>{decodeURIComponent(error)}</p>
        </div>
      )}
      {!canManage && (
        <div className="card" style={{ borderLeft: '3px solid var(--role-finance-dark)', marginBottom: 20 }}>
          <p style={{ color: 'var(--role-finance-dark)', margin: 0, fontSize: 13 }}>
            👁️ Mod vizualizare — doar Label Manager poate modifica permisiunile.
          </p>
        </div>
      )}

      {/* Selector artist */}
      <PermissionsSelector artists={artists} artistId={artistId} />

      {/* Lista melodii artist — vizibilă când e ales artistul dar nu și piesa */}
      {artistId && !selectedTrack && artistTracks.length > 0 && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>
            Melodiile lui {selectedArtist?.name} ({artistTracks.length})
          </h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {artistTracks.map((t) => (
              <a
                key={t.id}
                href={`/compliance/permissions?artist=${artistId}&trackId=${t.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)',
                  background: 'var(--bg-primary)', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 14 }}>
                    {t.title}
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>
                      {t.genre ?? '—'} · {t.status === 'RELEASED' ? 'Lansată' : 'Nelansată'}
                    </span>
                  </span>
                  <span className="badge" style={{
                    background: t.aiPermission ? 'var(--role-ar-light)' : 'var(--bg-tertiary)',
                    color: t.aiPermission ? 'var(--role-ar-dark)' : 'var(--text-secondary)',
                    fontSize: 11,
                  }}>
                    {t.aiPermission ? 'Configurat' : 'Neconfigurat'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Formular / vizualizare permisiuni pentru piesa selectată */}
      {selectedTrack && (
        <section className="card">
          {/* Track header */}
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Permisiuni AI pentru
            </div>
            <strong style={{ fontSize: 17 }}>{selectedTrack.title}</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, marginLeft: 8 }}>
              {selectedArtist?.name}
            </span>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {selectedTrack.genre ?? '—'}
              {selectedTrack.isrc && ` · ISRC: ${selectedTrack.isrc}`}
              {' · '}{selectedTrack.status === 'RELEASED' ? 'Lansată' : 'Nelansată'}
            </div>
          </div>

          <PermissionsForm
            trackId={selectedTrack.id}
            artistId={artistId}
            perm={perm}
            canManage={canManage}
          />
        </section>
      )}

      {/* Placeholder când nu e nimic selectat */}
      {!artistId && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}></div>
          <p style={{ margin: 0, fontSize: 14 }}>
            Selectează un artist din dropdown-ul de mai sus pentru a configura permisiunile melodiilor sale.
          </p>
        </div>
      )}
    </AppShell>
  )
}
