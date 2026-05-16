import Link from 'next/link'
import { SessionPayload } from '@/lib/session'
import { ROLES, getRoleDisplayName } from '@/lib/roles'
import { SidebarNav } from '@/components/sidebar-nav'
import { TopNav } from '@/components/top-nav'
import { UserMenu } from '@/components/user-menu'
import { prisma } from '@/lib/prisma'

type AppShellProps = {
  session: SessionPayload
  title: string
  subtitle?: string
  children: React.ReactNode
}

export async function AppShell({ session, title, subtitle, children }: AppShellProps) {
  const isSuperAdmin = session.role === ROLES.SUPER_ADMIN

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true },
  })

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilizator'
  const roleDisplay = getRoleDisplayName(session.role)

  if (isSuperAdmin) {
    return (
      <>
        {/* ── Header fix sus (SUPER_ADMIN) ── */}
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            height: 56,
            background: 'rgba(35, 33, 43, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ height: 56, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <Link href="/dashboard">
              <img
                src="/LOGO/logo3.svg"
                alt="SoundLedger"
                height={160}
                style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }}
              />
            </Link>
          </div>
          <UserMenu
            initials={initials}
            displayName={displayName}
            roleDisplay={roleDisplay}
            role={session.role}
          />
        </header>

        {/* ── Layout cu sidebar ── */}
        <div style={{ display: 'flex', marginTop: 56, minHeight: 'calc(100vh - 56px)' }}>
          <SidebarNav role={session.role} isArtist={false} />
          <main style={{ flex: 1, minWidth: 0, padding: 24 }}>
            <header className="page-header">
              <div>
                <h1 className="page-title">{title}</h1>
                {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
              </div>
            </header>
            {children}
          </main>
        </div>
      </>
    )
  }

  // ── Layout cu TopNav orizontal (toți ceilalți) ──
  return (
    <>
      <TopNav
        role={session.role}
        initials={initials}
        displayName={displayName}
        roleDisplay={roleDisplay}
      />
      <div style={{ paddingTop: 56, minHeight: '100vh' }}>
        <main
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '24px 24px',
          }}
        >
          <header className="page-header">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
            </div>
          </header>
          {children}
        </main>
      </div>
    </>
  )
}
