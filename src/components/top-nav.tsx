'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROLES } from '@/lib/roles'
import { UserMenu } from '@/components/user-menu'

type NavLink = { href: string; label: string }

const NAV_LINKS: Record<string, NavLink[]> = {
  [ROLES.SUPER_ADMIN]: [
    { href: '/admin', label: 'Case de discuri' },
  ],
  [ROLES.LABEL_MANAGER]: [
    { href: '/dashboard',  label: 'Acasă' },
    { href: '/artists',    label: 'Artiști' },
    { href: '/catalog',    label: 'Catalog' },
    { href: '/releases',   label: 'Lansări' },
    { href: '/ar',         label: 'Scouting' },
    { href: '/contracts',  label: 'Contracte' },
    { href: '/compliance', label: 'Detectare' },
    { href: '/team',       label: 'Echipa Creativă' },
  ],
  [ROLES.FINANCIAL]: [
    { href: '/dashboard',          label: 'Acasă' },
    { href: '/contracts',          label: 'Contracte' },
    { href: '/finance',            label: 'Venituri' },
    { href: '/finance/royalties',  label: 'Redevențe' },
    { href: '/finance/cheltuieli', label: 'Cheltuieli' },
    { href: '/finance/recoupment', label: 'Profit & Pierderi' },
  ],

}

function isNavActive(href: string, pathname: string): boolean {
  if (href === '/compliance') {
    return pathname.startsWith('/compliance')
  }
  if (href === '/ar') {
    return pathname === '/ar' || pathname.startsWith('/ar/')
  }
  if (href === '/finance') {
    return pathname === '/finance'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

type Props = {
  role: string
  initials: string
  displayName: string
  roleDisplay: string
  email: string
  avatarUrl?: string
  plan?: string | null
  planExpiry?: string | null
}

export function TopNav({ role, initials, displayName, roleDisplay, email, avatarUrl, plan, planExpiry }: Props) {
  const pathname = usePathname()
  const links = NAV_LINKS[role] ?? []

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 56,
        background: 'rgba(16, 14, 30, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(155, 148, 240, 0.10)',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 20px',
      }}
    >
      {/* Logo — stânga */}
      <div
        style={{
          height: 56,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          marginRight: 20,
          flexShrink: 0,
        }}
      >
        <Link href="/dashboard">
          <img
            src="/LOGO/logo3.svg"
            alt="SoundLedger"
            height={160}
            style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }}
          />
        </Link>
      </div>

      {/* Nav links — centrat absolut față de header */}
      <nav
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          gap: 50,
        }}
      >
        {links.map((link) => {
          const active = isNavActive(link.href, pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                fontSize: 14,
                fontWeight: 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderBottom: active
                  ? '2px solid var(--primary)'
                  : '2px solid transparent',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Dreapta: avatar menu */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          marginLeft: 'auto',
        }}
      >
        <UserMenu
          initials={initials}
          displayName={displayName}
          roleDisplay={roleDisplay}
          email={email}
          role={role}
          avatarUrl={avatarUrl}
          plan={plan}
          planExpiry={planExpiry}
        />
      </div>
    </header>
  )
}
