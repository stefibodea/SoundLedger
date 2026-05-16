'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Mic2,
  ListMusic,
  CalendarDays,
  FileText,
  TrendingUp,
  Binoculars,
  ShieldCheck,
  Fingerprint,
  Users,
  User,
  Music2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import {
  canManageArtists,
  canUseScouting,
  canViewContracts,
  canViewFinance,
  canViewCatalog,
  canManageReleases,
  canManageTeam,
  canViewCompliance,
} from '@/lib/roles'

// ── Types ──────────────────────────────────────────────────────────────────────

type Props = {
  role: string
  isArtist: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isActiveLink(href: string, pathname: string): boolean {
  if (href === '/compliance') {
    return pathname.startsWith('/compliance') && !pathname.startsWith('/compliance/fingerprints')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  pathname,
  isCollapsed,
}: {
  href: string
  icon: LucideIcon
  label: string
  pathname: string
  isCollapsed: boolean
}) {
  const active = isActiveLink(href, pathname)
  return (
    <Link
      href={href}
      className={`sl-nav-item${active ? ' active' : ''}${isCollapsed ? ' collapsed' : ''}`}
      data-label={label}
    >
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            background: 'var(--primary)',
            borderRadius: 2,
          }}
        />
      )}
      <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span className="sl-nav-label">{label}</span>
    </Link>
  )
}

function SectionHeader({
  label,
  first = false,
  isCollapsed,
}: {
  label: string
  first?: boolean
  isCollapsed: boolean
}) {
  if (isCollapsed) return null
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'rgba(200,198,188,0.45)',
        padding: '0 12px',
        marginTop: first ? 0 : 16,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SidebarNav({ role, isArtist }: Props) {
  const pathname   = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved === 'true') setIsCollapsed(true)
    } catch {}
  }, [])

  function toggle() {
    const next = !isCollapsed
    setIsCollapsed(next)
    try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
  }

  const sidebarWidth = isCollapsed ? 64 : 240

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-light)',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 56,
        height: 'calc(100vh - 56px)',
        alignSelf: 'flex-start',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'visible',
        flexShrink: 0,
      }}
    >
      <style>{`
        .sl-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 400;
          text-decoration: none;
          position: relative;
          transition: background 0.15s ease, color 0.15s ease, padding 0.2s ease;
          overflow: hidden;
        }
        .sl-nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .sl-nav-item.active {
          background: rgba(155, 148, 240, 0.12);
          color: var(--text-primary);
          font-weight: 500;
        }
        .sl-nav-item.collapsed {
          justify-content: center;
          padding: 8px;
          overflow: visible;
        }
        .sl-nav-label {
          white-space: nowrap;
          transition: opacity 0.15s ease, visibility 0.15s;
        }
        .sl-nav-item.collapsed .sl-nav-label {
          opacity: 0;
          visibility: hidden;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }
        /* CSS-pure tooltip when collapsed */
        .sl-nav-item.collapsed::after {
          content: attr(data-label);
          position: absolute;
          left: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%);
          background: var(--bg-tertiary);
          border: 0.5px solid var(--border-light);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-primary);
          white-space: nowrap;
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.1s ease, visibility 0.1s;
          pointer-events: none;
        }
        .sl-nav-item.collapsed:hover::after {
          opacity: 1;
          visibility: visible;
        }
        /* Toggle button */
        .sl-toggle-btn {
          position: absolute;
          right: -14px;
          top: 28px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 50;
          color: var(--text-secondary);
          transition: background 0.15s ease, color 0.15s ease;
          padding: 0;
          flex-shrink: 0;
        }
        .sl-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }
      `}</style>

      {/* ── Toggle button ── */}
      <button
        className="sl-toggle-btn"
        onClick={toggle}
        aria-label={isCollapsed ? 'Expandează sidebar' : 'Colapsează sidebar'}
      >
        {isCollapsed
          ? <ChevronRight size={13} strokeWidth={2} />
          : <ChevronLeft  size={13} strokeWidth={2} />
        }
      </button>

      {/* ── Navigation ── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isArtist ? (
          <>
            <NavItem href="/dashboard"   icon={LayoutDashboard} label="Dashboard"       pathname={pathname} isCollapsed={isCollapsed} />
            <NavItem href="/my-profile"  icon={User}            label="Profilul meu"    pathname={pathname} isCollapsed={isCollapsed} />
            <NavItem href="/my-music"    icon={Music2}          label="Muzica mea"      pathname={pathname} isCollapsed={isCollapsed} />
            <NavItem href="/my-contract" icon={FileText}        label="Contractul meu"  pathname={pathname} isCollapsed={isCollapsed} />
            <NavItem href="/my-revenues" icon={DollarSign}      label="Veniturile mele" pathname={pathname} isCollapsed={isCollapsed} />
          </>
        ) : (
          <>
            {/* GENERAL */}
            <SectionHeader label="General" first isCollapsed={isCollapsed} />
            <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" pathname={pathname} isCollapsed={isCollapsed} />
            {canManageArtists(role)  && <NavItem href="/artists"  icon={Mic2}        label="Artiști"  pathname={pathname} isCollapsed={isCollapsed} />}
            {canViewCatalog(role)    && <NavItem href="/catalog"  icon={ListMusic}    label="Catalog"  pathname={pathname} isCollapsed={isCollapsed} />}
            {canManageReleases(role) && <NavItem href="/releases" icon={CalendarDays} label="Lansări"  pathname={pathname} isCollapsed={isCollapsed} />}

            {/* BUSINESS */}
            <SectionHeader label="Business" isCollapsed={isCollapsed} />
            {canViewContracts(role) && <NavItem href="/contracts" icon={FileText}  label="Contracte" pathname={pathname} isCollapsed={isCollapsed} />}
            {canViewFinance(role)   && <NavItem href="/finance"   icon={TrendingUp} label="Finanțe"   pathname={pathname} isCollapsed={isCollapsed} />}
            {canUseScouting(role)   && <NavItem href="/ar"        icon={Binoculars} label="Scouting"  pathname={pathname} isCollapsed={isCollapsed} />}

            {/* COMPLIANCE */}
            {canViewCompliance(role) && (
              <>
                <SectionHeader label="Compliance" isCollapsed={isCollapsed} />
                <NavItem href="/compliance"              icon={ShieldCheck} label="AI Compliance"     pathname={pathname} isCollapsed={isCollapsed} />
                <NavItem href="/compliance/fingerprints" icon={Fingerprint} label="Fingerprints audio" pathname={pathname} isCollapsed={isCollapsed} />
              </>
            )}

            {/* WORKSPACE */}
            {canManageTeam(role) && (
              <>
                <SectionHeader label="Workspace" isCollapsed={isCollapsed} />
                <NavItem href="/team" icon={Users} label="Echipă" pathname={pathname} isCollapsed={isCollapsed} />
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  )
}
