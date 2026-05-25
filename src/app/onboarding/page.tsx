import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { createArtistAction } from '@/app/actions/artists'
import {
  createOnboardingTrackAction,
  inviteOnboardingMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from '@/app/actions/onboarding'
import { getOnboardingState } from '@/lib/onboarding'

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await requireSession()
  if (session.role !== ROLES.LABEL_MANAGER || !session.labelId) {
    redirect('/dashboard')
  }

  const params = (await searchParams) ?? {}
  const inviteToken = typeof params.invite === 'string' ? params.invite : null
  const mailStatus = typeof params.mail === 'string' ? params.mail : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

  const [state, artists, invitations] = await Promise.all([
    getOnboardingState(session.labelId),
    prisma.artist.findMany({ where: { labelId: session.labelId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.invitation.findMany({
      where: {
        labelId: session.labelId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  if (state.completed) {
    redirect('/dashboard')
  }

  const completedSteps = [state.hasProfile, state.hasArtist, state.hasTrack, state.hasMember].filter(Boolean).length

  return (
    <AppShell
      session={session}
      title="Onboarding ghidat"
    >
      <section className="card" style={{ marginBottom: 20 }}>
        <h3>Progres</h3>
        <ul style={{ marginTop: 10, paddingLeft: 18, color: 'var(--text-secondary)' }}>
          <li>Profil label: {state.hasProfile ? 'Completat' : 'În așteptare'}</li>
          <li>Primul artist: {state.hasArtist ? 'Completat' : 'În așteptare'}</li>
          <li>Prima piesă: {state.hasTrack ? 'Completat' : 'În așteptare'}</li>
          <li>Primul membru de echipă: {state.hasMember ? 'Completat' : 'În așteptare'}</li>
        </ul>
      </section>

      {inviteToken && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Invitație creată</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Trimite acest link către membrul echipei pentru activarea contului:
          </p>
          <code style={{ display: 'block', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, overflowX: 'auto' }}>
            {`${appUrl}/invite/${inviteToken}`}
          </code>
          {mailStatus === 'ok' && (
            <p style={{ color: 'var(--role-ar-dark)', marginTop: 8 }}>
              Email-ul a fost trimis automat către utilizator.
            </p>
          )}
          {mailStatus === 'smtp_missing' && (
            <p style={{ color: 'var(--role-finance-dark)', marginTop: 8 }}>
              SMTP nu este configurat. Copiază manual linkul sau configurează variabilele SMTP.
            </p>
          )}
        </section>
      )}

      {mailStatus === 'resent' && (
        <section className="card" style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--role-ar-dark)' }}>Invitația a fost retrimisă prin email.</p>
        </section>
      )}

      {!state.hasArtist && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Pas 2: Adaugă primul artist</h3>
          <form action={createArtistAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="name">Nume artist</label>
                <input id="name" name="name" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="genre">Gen muzical</label>
                <input id="genre" name="genre" className="form-input" required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Salvează artist</button>
          </form>
        </section>
      )}

      {state.hasArtist && !state.hasTrack && (
        <section className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Pas 3: Adaugă prima piesă</h3>
          <form action={createOnboardingTrackAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="title">Titlu piesă</label>
                <input id="title" name="title" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="trackGenre">Gen</label>
                <input id="trackGenre" name="genre" className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="artistId">Artist</label>
              <select id="artistId" name="artistId" className="form-input form-select" required>
                <option value="">Selectează artist</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit">Salvează piesă</button>
          </form>
        </section>
      )}

      {state.hasArtist && state.hasTrack && !state.hasMember && (
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Pas 4: Invită un membru al echipei</h3>
          <form action={inviteOnboardingMemberAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="role">Rol</label>
                <select id="role" name="role" className="form-input form-select" defaultValue={ROLES.FINANCIAL}>
                  <option value={ROLES.FINANCIAL}>Departament Financiar</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Invită membru</button>
          </form>

          {invitations.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h4 style={{ marginBottom: 8 }}>Invitații active</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Expiră</th>
                      <th>Link</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invitation) => (
                      <tr key={invitation.id}>
                        <td>{invitation.email}</td>
                        <td>{invitation.role}</td>
                        <td>{invitation.expiresAt.toLocaleDateString('ro-RO')}</td>
                        <td>
                          <code>{`${appUrl}/invite/${invitation.token}`}</code>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <form action={resendInvitationAction}>
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <button className="btn btn-sm btn-secondary" type="submit">Resend</button>
                            </form>
                            <form action={revokeInvitationAction}>
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <button className="btn btn-sm btn-danger" type="submit">Revoke</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </AppShell>
  )
}
