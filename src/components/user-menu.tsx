'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { UserRound, LogOut, Zap } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

const PLAN_LABELS: Record<string, string> = {
  FREE_TRIAL: 'Gratuit',
  INDIE:      'Indie',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
  FREE_TRIAL: 'var(--text-secondary)',
  INDIE:      '#60a5fa',
  PRO:        '#9B94F0',
  ENTERPRISE: '#fde68a',
}

const ROLE_GRADIENTS: Record<string, string> = {
  SUPER_ADMIN:   'linear-gradient(135deg, #fca5a5, #e85d5d)',
  LABEL_MANAGER: 'linear-gradient(135deg, #9B94F0, #6366f1)',
  FINANCIAL:     'linear-gradient(135deg, #fde68a, #f59e0b)',
}

const ROLE_COLORS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.12)', text: '#fca5a5', glow: 'rgba(252,165,165,0.35)', border: 'rgba(252,165,165,0.3)' },
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.12)', text: '#9B94F0',  glow: 'rgba(155,148,240,0.35)', border: 'rgba(155,148,240,0.3)' },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.12)', text: '#fde68a',  glow: 'rgba(253,230,138,0.35)', border: 'rgba(253,230,138,0.3)' },
}

type Props = {
  initials: string
  displayName: string
  roleDisplay: string
  email: string
  role: string
  avatarUrl?: string
  plan?: string | null
  planExpiry?: string | null
}

export function UserMenu({ initials, displayName, roleDisplay, email, role, avatarUrl, plan, planExpiry }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [logoutHover, setLogoutHover] = useState(false)
  const [settingsHover, setSettingsHover] = useState(false)
  const [isPending, startTransition] = useTransition()

  const gradient = ROLE_GRADIENTS[role] ?? ROLE_GRADIENTS.LABEL_MANAGER
  const colors   = ROLE_COLORS[role]    ?? ROLE_COLORS.LABEL_MANAGER

  const close = () => setIsOpen(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* ── Avatar trigger ── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Meniu utilizator"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.glow}, 0 0 16px ${colors.glow}`
          e.currentTarget.style.transform = 'scale(1.07)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.border}`
          e.currentTarget.style.transform = 'scale(1)'
        }}
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
          boxShadow: `0 0 0 2px ${colors.border}`,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          fontFamily: 'inherit',
          flexShrink: 0,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          initials
        )}
      </button>

      {/* ── Overlay ── */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 199,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ── Slide-in panel ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 300,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          {/* X button */}
          <button
            onClick={close}
            aria-label="Închide"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 20,
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            ×
          </button>

          {/* Large avatar */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: gradient,
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: 'white',
            boxShadow: `0 0 0 3px ${colors.border}, 0 0 20px ${colors.glow}`,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              initials
            )}
          </div>

          {/* Name */}
          <div style={{
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}>
            {displayName}
          </div>

          {/* Role badge */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 999,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              fontSize: 11,
              fontWeight: 600,
              color: colors.text,
              letterSpacing: '0.02em',
            }}>
              {roleDisplay}
            </span>
          </div>

          {/* Email */}
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {email}
          </div>
        </div>

        {/* ── Nav items ── */}
        <div style={{ padding: '8px 0 16px' }}>
          <Link
            href="/settings"
            onClick={close}
            onMouseEnter={() => setSettingsHover(true)}
            onMouseLeave={() => setSettingsHover(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              cursor: 'pointer',
              textDecoration: 'none',
              color: settingsHover ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 14,
              background: settingsHover ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            <UserRound size={18} />
            Profilul meu
          </Link>

          {/* ── Plan card ── */}
          {plan && (
            <div style={{ padding: '0 16px', marginTop: 8 }}>
              <Link
                href="/settings?tab=abonament"
                onClick={close}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${PLAN_COLORS[plan] ?? 'rgba(255,255,255,0.08)'}26`,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Plan activ
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: PLAN_COLORS[plan] ?? 'var(--text-secondary)',
                      background: `${PLAN_COLORS[plan] ?? '#fff'}18`,
                      border: `1px solid ${PLAN_COLORS[plan] ?? '#fff'}30`,
                      padding: '1px 8px', borderRadius: 999,
                    }}>
                      {PLAN_LABELS[plan] ?? plan}
                    </span>
                  </div>
                  {planExpiry && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Expiră{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {new Date(planExpiry).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {(plan === 'FREE_TRIAL' || plan === 'INDIE') && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9B94F0' }}>
                      <Zap size={11} />
                      Upgrade plan
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── Logout ── */}
        <div style={{
          padding: '12px 20px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <form action={() => startTransition(() => logoutAction())}>
            <button
              type="submit"
              disabled={isPending}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: 10,
                background: logoutHover ? 'rgba(252,165,165,0.15)' : 'rgba(252,165,165,0.08)',
                border: '1px solid rgba(252,165,165,0.2)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 14,
                fontWeight: 500,
                cursor: isPending ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
            >
              <LogOut size={16} />
              {isPending ? 'Se deconectează…' : 'Deconectare'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
