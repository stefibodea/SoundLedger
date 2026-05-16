'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { ROLES } from '@/lib/roles'

const ROLE_GRADIENTS: Record<string, string> = {
  SUPER_ADMIN:   'linear-gradient(135deg, #fca5a5, #e85d5d)',
  LABEL_MANAGER: 'linear-gradient(135deg, #9B94F0, #6366f1)',
  AR_MANAGER:    'linear-gradient(135deg, #6ee7b7, #10b981)',
  FINANCIAL:     'linear-gradient(135deg, #fde68a, #f59e0b)',
  ARTIST:        'linear-gradient(135deg, #93c5fd, #3b82f6)',
}

const ROLE_COLORS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.12)', text: '#fca5a5', glow: 'rgba(252,165,165,0.35)', border: 'rgba(252,165,165,0.3)' },
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.12)', text: '#9B94F0',  glow: 'rgba(155,148,240,0.35)', border: 'rgba(155,148,240,0.3)' },
  AR_MANAGER:    { bg: 'rgba(110,231,183,0.12)', text: '#6ee7b7',  glow: 'rgba(110,231,183,0.35)', border: 'rgba(110,231,183,0.3)'  },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.12)', text: '#fde68a',  glow: 'rgba(253,230,138,0.35)', border: 'rgba(253,230,138,0.3)'  },
  ARTIST:        { bg: 'rgba(147,197,253,0.12)', text: '#93c5fd',  glow: 'rgba(147,197,253,0.35)', border: 'rgba(147,197,253,0.3)'  },
}

type Props = {
  initials: string
  displayName: string
  roleDisplay: string
  role: string
}

export function UserMenu({ initials, displayName, roleDisplay, role }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [logoutHover, setLogoutHover] = useState(false)
  const [profileHover, setProfileHover] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  const gradient  = ROLE_GRADIENTS[role] ?? ROLE_GRADIENTS.LABEL_MANAGER
  const colors    = ROLE_COLORS[role]    ?? ROLE_COLORS.LABEL_MANAGER
  const isArtist  = role === ROLES.ARTIST

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <>
      <style>{`
        @keyframes um-drop-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .um-dropdown {
          animation: um-drop-in 0.18s ease forwards;
        }
      `}</style>

      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>

        {/* ── Avatar trigger ── */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.glow}, 0 0 16px ${colors.glow}`
            e.currentTarget.style.transform = 'scale(1.07)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isOpen
              ? `0 0 0 2px ${colors.border}, 0 0 10px ${colors.glow}`
              : `0 0 0 2px ${colors.border}`
            e.currentTarget.style.transform = isOpen ? 'scale(1.05)' : 'scale(1)'
          }}
          aria-label="Meniu utilizator"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: gradient,
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isOpen ? 'scale(1.05)' : 'scale(1)',
            boxShadow: isOpen
              ? `0 0 0 2px ${colors.border}, 0 0 10px ${colors.glow}`
              : `0 0 0 2px ${colors.border}`,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {initials}
        </button>

        {/* ── Dropdown ── */}
        {isOpen && (
          /* Gradient border wrapper */
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              padding: 1,
              borderRadius: 13,
              background: 'linear-gradient(135deg, #9B94F0 0%, #22d3ee 100%)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 24px rgba(155,148,240,0.12)',
              zIndex: 200,
            }}
          >
            <div
              className="um-dropdown"
              style={{
                minWidth: 210,
                background: 'rgba(22,20,32,0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* ── Header: avatar + nume + rol badge ── */}
              <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                {/* Mini avatar */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: gradient,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: `0 0 0 2px ${colors.border}, 0 0 8px ${colors.glow}`,
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#f0efe8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {displayName}
                  </div>
                  {/* Rol badge */}
                  <div style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: colors.text,
                    letterSpacing: '0.02em',
                  }}>
                    {roleDisplay}
                  </div>
                </div>
              </div>

              {/* ── Profil meu — doar Artist ── */}
              {isArtist && (
                <button
                  type="button"
                  onMouseEnter={() => setProfileHover(true)}
                  onMouseLeave={() => setProfileHover(false)}
                  onClick={() => { setIsOpen(false); window.location.href = '/my-profile' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    color: profileHover ? '#f0efe8' : '#c8c6bc',
                    width: '100%',
                    textAlign: 'left',
                    background: profileHover ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  Profilul meu
                </button>
              )}

              {/* ── Deconectare ── */}
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => logoutAction())}
                onMouseEnter={() => setLogoutHover(true)}
                onMouseLeave={() => setLogoutHover(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  fontSize: 13,
                  color: logoutHover ? '#ff6b6b' : '#fca5a5',
                  width: '100%',
                  textAlign: 'left',
                  background: logoutHover ? 'rgba(252,100,100,0.08)' : 'transparent',
                  border: 'none',
                  cursor: isPending ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.12s ease, color 0.12s ease',
                  filter: logoutHover ? 'drop-shadow(0 0 6px rgba(255,107,107,0.5))' : 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {isPending ? 'Se deconectează…' : 'Deconectare'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
