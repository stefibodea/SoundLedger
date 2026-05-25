import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { ROLE_LABELS, canManageTeam } from '@/lib/roles'
import { revokeTeamInvitationAction } from '@/app/actions/team'
import { enforceOnboarding } from '@/lib/onboarding'
import { TeamPageClient, type MemberRow, type DepartmentGroup } from './team-client'

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

  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: {
        labelId: session.labelId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invitation.findMany({
      where: { labelId: session.labelId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const memberRows: MemberRow[] = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
  }))

  const departments: DepartmentGroup[] = [
    {
      key: 'management',
      label: 'Management',
      members: memberRows.filter((m) =>
        ['LABEL_MANAGER', 'AR_MANAGER', 'SUPER_ADMIN'].includes(m.role),
      ),
    },
    {
      key: 'financial',
      label: 'Departament Financiar',
      members: memberRows.filter((m) => m.role === 'FINANCIAL'),
    },
  ].filter((d) => d.members.length > 0)

  const totalCount = memberRows.length
  const subtitle = `${totalCount} ${totalCount === 1 ? 'membru' : 'membri'}`

  return (
    <AppShell session={session} title="Echipă" subtitle={subtitle}>
      {errorMsg && (
        <div
          className="card"
          style={{ marginBottom: 16, borderLeft: '3px solid var(--status-expired)', padding: '12px 16px' }}
        >
          <p style={{ color: 'var(--status-expired)', margin: 0 }}>{decodeURIComponent(errorMsg)}</p>
        </div>
      )}

      {inviteToken && inviteToken !== 'revoked' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Invitație creată</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Trimite acest link membrului pentru activarea contului:
          </p>
          <code
            style={{
              display: 'block',
              padding: 10,
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              overflowX: 'auto',
              fontSize: 13,
            }}
          >
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

      <TeamPageClient
        departments={departments}
        canManage={canManageTeam(session.role)}
        currentUserId={session.userId}
      />

      {invitations.length > 0 && (
        <section className="card" style={{ marginTop: 8 }}>
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
                      <span
                        className="badge"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const daysLeft = Math.ceil(
                          (inv.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                        )
                        return (
                          <span
                            style={{
                              color:
                                daysLeft <= 1
                                  ? 'var(--status-expired)'
                                  : daysLeft <= 3
                                    ? 'var(--role-finance-dark)'
                                    : 'var(--text-secondary)',
                              fontSize: 13,
                            }}
                          >
                            {daysLeft <= 0
                              ? 'Expiră azi'
                              : `expiră în ${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}`}
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
                        <button className="btn btn-sm btn-danger" type="submit">
                          Revocă
                        </button>
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
