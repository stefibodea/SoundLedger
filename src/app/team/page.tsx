import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLES, ROLE_LABELS, canManageTeam } from '@/lib/roles'
import { inviteTeamMemberAction, revokeTeamInvitationAction } from '@/app/actions/team'
import { enforceOnboarding } from '@/lib/onboarding'

type TeamPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const session = await requireSession()
  await enforceOnboarding(session, '/team')
  if (!session.labelId || !canManageTeam(session.role)) {
    redirect('/dashboard')
  }

  const params = (await searchParams) ?? {}
  const inviteToken = typeof params.invite === 'string' ? params.invite : null
  const mailStatus = typeof params.mail === 'string' ? params.mail : null
  const errorMsg = typeof params.error === 'string' ? params.error : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

  const [label, members, invitations] = await Promise.all([
    prisma.label.findUnique({
      where: { id: session.labelId },
      include: { owner: true, members: true },
    }),
    prisma.user.findMany({
      where: { labelId: session.labelId, NOT: { ownedLabel: { id: session.labelId } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invitation.findMany({
      where: { labelId: session.labelId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <AppShell session={session} title="Echipă">
      {errorMsg && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}>
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(errorMsg)}</p>
        </div>
      )}

      {inviteToken && inviteToken !== 'revoked' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Invitație creată</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Trimite acest link membrului pentru activarea contului:
          </p>
          <code style={{ display: 'block', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, overflowX: 'auto', fontSize: 13 }}>
            {`${appUrl}/invite/${inviteToken}`}
          </code>
          {mailStatus === 'ok' && (
            <p style={{ color: 'var(--role-ar-dark)', marginTop: 8 }}>Email-ul a fost trimis automat.</p>
          )}
          {mailStatus === 'mail_error' && (
            <p style={{ color: 'var(--role-finance-dark)', marginTop: 8 }}>
              Email-ul nu a putut fi trimis automat. Copiază manual linkul de mai sus.
            </p>
          )}
        </div>
      )}

      <section className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Invită membru nou</h3>
        <form action={inviteTeamMemberAction}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="role">Rol</label>
              <select id="role" name="role" className="form-input form-select" defaultValue={ROLES.AR_MANAGER}>
                <option value={ROLES.AR_MANAGER}>A&R Manager</option>
                <option value={ROLES.FINANCIAL}>Departament Financiar</option>
                <option value={ROLES.ARTIST}>Artist</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Invită</button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Membrii echipei</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nume</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Tip</th>
                <th>Înregistrat la</th>
              </tr>
            </thead>
            <tbody>
              {label?.owner && (
                <tr>
                  <td><strong>{label.owner.firstName} {label.owner.lastName}</strong></td>
                  <td>{label.owner.email}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--role-label-light)', color: 'var(--role-label-dark)' }}>
                      {ROLE_LABELS[label.owner.role] ?? label.owner.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Proprietar</td>
                  <td>{label.owner.createdAt.toLocaleDateString('ro-RO')}</td>
                </tr>
              )}
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.firstName} {member.lastName}</td>
                  <td>{member.email}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Membru</td>
                  <td>{member.createdAt.toLocaleDateString('ro-RO')}</td>
                </tr>
              ))}
              {!label?.owner && members.length === 0 && (
                <tr><td colSpan={5}>Niciun membru găsit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {invitations.length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 12 }}>Invitații în așteptare ({invitations.length})</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Expiră</th>
                  <th>Link invitație</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const daysLeft = Math.ceil((inv.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        return (
                          <span style={{ color: daysLeft <= 1 ? 'var(--status-expired)' : daysLeft <= 3 ? 'var(--role-finance-dark)' : 'var(--text-secondary)', fontSize: 13 }}>
                            {daysLeft <= 0 ? 'Expiră azi' : `expiră în ${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}`}
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      <code style={{ fontSize: 12 }}>{`${appUrl}/invite/${inv.token}`}</code>
                    </td>
                    <td>
                      <form action={revokeTeamInvitationAction}>
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <button className="btn btn-sm btn-danger" type="submit">Revocă</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  )
}
