import { SessionPayload } from '@/lib/session'
import { getRoleDisplayName } from '@/lib/roles'
import { TopNav } from '@/components/top-nav'
import { prisma } from '@/lib/prisma'

type AppShellProps = {
  session: SessionPayload
  title?: string
  subtitle?: string
  children: React.ReactNode
}

export async function AppShell({ session, title, subtitle, children }: AppShellProps) {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true, email: true, avatar: true },
  })

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilizator'
  const roleDisplay = getRoleDisplayName(session.role)
  const email       = user?.email ?? session.userId
  const avatarUrl   = user?.avatar ? `/uploads/avatars/${user.avatar}` : undefined

  return (
    <>
      <TopNav
        role={session.role}
        initials={initials}
        displayName={displayName}
        roleDisplay={roleDisplay}
        email={email}
        avatarUrl={avatarUrl}
      />
      <div style={{ paddingTop: 56, minHeight: '100vh' }}>
        <main
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '24px 24px',
          }}
        >
          {title && (
            <header className="page-header">
              <div>
                <h1 className="page-title">{title}</h1>
                {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
              </div>
            </header>
          )}
          {children}
        </main>
      </div>
    </>
  )
}
