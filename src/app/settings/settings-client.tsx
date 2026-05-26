'use client'

import { useState, useEffect, useTransition } from 'react'
import { ProfileForm } from '@/app/profile/profile-form'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PrintButton } from './print-button'
import { updateLabelAction, requestUpgradeAction } from '@/app/actions/settings'
import { issueOptOutDeclarationAction, revokeOptOutDeclarationAction } from '@/app/actions/compliance-ai'
import { changePasswordAction } from '@/app/actions/profile'
import { inviteTeamMemberAction, revokeTeamInvitationAction } from '@/app/actions/team'
import { ROLES, ROLE_LABELS } from '@/lib/roles'
import { Modal } from '@/components/ui/Modal'

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
const PLAN_DESCRIPTIONS: Record<string, string> = {
  FREE_TRIAL: 'Ești pe planul gratuit. Fă upgrade pentru funcții avansate.',
  INDIE:      'Plan Indie — acces la funcțiile de bază ale platformei.',
  PRO:        'Plan Pro — acces complet la toate modulele.',
  ENTERPRISE: 'Plan Enterprise — acces nelimitat + suport dedicat.',
}
const PLAN_FEATURES: Record<string, string[]> = {
  FREE_TRIAL: ['Până la 10 artiști', 'Până la 50 piese', 'Rapoarte de bază', 'AI Compliance (limitat)'],
  INDIE:      ['Până la 25 artiști', 'Piese nelimitate', 'Export CSV', 'AI Compliance complet', 'Scanner piracy'],
  PRO:        ['Artiști nelimitați', 'Piese nelimitate', 'Toate rapoartele', 'AI Compliance + Certificate', 'Scanner piracy avansat', 'Scouting A&R AI'],
  ENTERPRISE: ['Tot din Pro', 'SLA garantat', 'Suport dedicat', 'Integrări custom', 'Multi-label management'],
}
const SUCCESS_MESSAGES: Record<string, string> = {
  profil_actualizat:  'Profilul a fost actualizat cu succes.',
  parola_actualizata: 'Parola a fost schimbată cu succes.',
  label_actualizat:   'Informațiile labelului au fost actualizate.',
  optout_emis:        'Declarația de Opt-Out a fost emisă cu succes și este acum activă.',
  upgrade_solicitat:  'Cererea de upgrade a fost trimisă. Te vom contacta în curând.',
}
const ERROR_MESSAGES: Record<string, string> = {
  campuri_obligatorii:        'Prenumele și numele sunt obligatorii.',
  email_invalid:              'Adresa de email nu este validă.',
  parola_incorecta:           'Parola actuală este incorectă.',
  parolele_nu_coincid:        'Parolele noi nu coincid.',
  parola_prea_scurta:         'Parola nouă trebuie să aibă cel puțin 8 caractere.',
  parola_fara_litera_mare:    'Parola nouă trebuie să conțină cel puțin o literă mare.',
  parola_fara_cifra:          'Parola nouă trebuie să conțină cel puțin o cifră.',
  parola_fara_special:        'Parola nouă trebuie să conțină cel puțin un caracter special.',
  utilizator_negasit:         'Utilizatorul nu a fost găsit.',
}

export type UserData = {
  firstName:   string
  lastName:    string
  email:       string
  role:        string
  avatar:      string | null
  createdAt:   string
  labelName:   string | null
  initials:    string
  gradient:    string
  roleColors:  { bg: string; text: string; border: string }
  roleDisplay: string
}

export type LabelData = {
  name:       string
  country:    string
  city:       string
  genre:      string
  logo:       string | null
  plan:       string
  planExpiry: string | null
} | null

export type OptOutData = {
  declarationCode: string
  issuedAt:        string
  legalBasis:      string
  notes:           string | null
  isRevoked:       boolean
  revokedAt:       string | null
  revokedReason:   string | null
} | null

type MemberRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
}

type InvitationRow = {
  id: string
  email: string
  role: string
  token: string
  expiresAt: string
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.15)', color: '#9B94F0' },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.15)', color: '#fde68a' },
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.15)', color: '#fca5a5' },
}

type Props = {
  initialTab:        string
  success?:          string
  error?:            string
  revoked?:          string
  inviteToken?:      string
  inviteMailStatus?: string
  appUrl:            string
  user:              UserData
  label:             LabelData
  optOut:            OptOutData
  tracksCount:       number
  canManageLabel:    boolean
  canOptOut:         boolean
  members:           MemberRow[]
  invitations:       InvitationRow[]
  currentUserId:     string
}

const GLASS: React.CSSProperties = {
  background: 'rgba(22,22,26,0.5)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 16,
  padding: '24px 28px',
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  color: 'rgba(200,198,188,0.40)',
  marginBottom: 14,
}

function Notification({ type, message }: { type: 'success' | 'error' | 'warning'; message: string }) {
  const s = {
    success: { bg: 'rgba(74,222,128,0.08)',   border: '1px solid rgba(74,222,128,0.25)',   color: '#4ade80' },
    error:   { bg: 'rgba(252,165,165,0.08)',  border: '1px solid rgba(252,165,165,0.25)',  color: '#fca5a5' },
    warning: { bg: 'rgba(253,230,138,0.08)',  border: '1px solid rgba(253,230,138,0.25)',  color: '#fde68a' },
  }[type]
  return (
    <div style={{ padding: '12px 16px', borderRadius: 10, background: s.bg, border: s.border, color: s.color, fontSize: 14, marginBottom: 20 }}>
      {message}
    </div>
  )
}

export function SettingsClient({
  initialTab, success, error, revoked, inviteToken, inviteMailStatus, appUrl,
  user, label, optOut, tracksCount, canManageLabel, canOptOut,
  members, invitations, currentUserId,
}: Props) {
  const [activeSection,    setActiveSection]    = useState('cont')
  const [revokeHover,      setRevokeHover]      = useState(false)
  const [inviteOpen,       setInviteOpen]       = useState(false)
  const [memberRoleFilter, setMemberRoleFilter] = useState('toate')
  const [, startTransition] = useTransition()

  const filteredMembers = memberRoleFilter === 'toate'
    ? members
    : members.filter(m => m.role === memberRoleFilter)

  const MEMBER_ROLES = [
    { value: 'LABEL_MANAGER', label: 'Director General', bg: 'rgba(155,148,240,0.12)', color: '#9B94F0', border: 'rgba(155,148,240,0.3)' },
    { value: 'FINANCIAL',     label: 'Manager Financiar', bg: 'rgba(218,165,32,0.12)', color: '#f0c040', border: 'rgba(218,165,32,0.3)' },
    { value: 'SUPER_ADMIN',   label: 'Super Admin',      bg: 'rgba(252,165,165,0.12)', color: '#fca5a5', border: 'rgba(252,165,165,0.3)' },
  ]

  const successMsg = success ? (SUCCESS_MESSAGES[success] ?? null) : null
  const errorMsg   = error   ? (ERROR_MESSAGES[error]     ?? decodeURIComponent(error)) : null
  const revokedMsg = revoked === '1' ? 'Declarația a fost revocată.' : null

  const navSections = [
    { id: 'cont',         label: 'Cont',           visible: true },
    { id: 'securitate',   label: 'Securitate',     visible: true },
    { id: 'membri',       label: 'Membri & Acces', visible: canManageLabel },
    { id: 'label-info',   label: 'Label',          visible: canManageLabel },
    { id: 'abonament',    label: 'Abonament',      visible: canManageLabel },
    { id: 'protectie-ai', label: 'Protecție AI',   visible: canOptOut },
  ].filter(s => s.visible)

  useEffect(() => {
    const handleScroll = () => {
      const offset = 100
      let current = navSections[0]?.id ?? 'cont'
      for (const s of navSections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= offset) {
          current = s.id
        }
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 88
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveSection(id)
  }

  const isOptOutActive  = optOut && !optOut.isRevoked
  const isOptOutRevoked = optOut && optOut.isRevoked
  const planColor = label ? (PLAN_COLORS[label.plan] ?? 'var(--text-primary)') : 'var(--text-primary)'

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

      {/* ── Anchor nav ── */}
      <nav style={{
        width: 180, flexShrink: 0,
        background: 'rgba(22,22,26,0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: '8px 0',
        position: 'sticky',
        top: 80,
      }}>
        {navSections.map(s => {
          const active = activeSection === s.id
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit',
                background: active ? 'rgba(155,148,240,0.1)' : 'transparent',
                border: 'none',
                borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: active ? 500 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </nav>

      {/* ── Content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {successMsg && <Notification type="success" message={successMsg} />}
        {errorMsg   && <Notification type="error"   message={errorMsg} />}
        {revokedMsg && <Notification type="warning" message={revokedMsg} />}

        {/* ── Invitație creată ── */}
        {inviteToken && inviteToken !== 'revoked' && (
          <div style={{ ...GLASS, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: 'var(--text-primary)' }}>Invitație creată</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>
              Trimite acest link membrului pentru activarea contului:
            </p>
            <code style={{ display: 'block', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, overflowX: 'auto', fontSize: 13, wordBreak: 'break-all' }}>
              {`${appUrl}/invite/${inviteToken}`}
            </code>
            {inviteMailStatus === 'ok' && (
              <p style={{ color: 'var(--role-ar-dark)', marginTop: 8, fontSize: 13 }}>Email-ul a fost trimis automat.</p>
            )}
            {inviteMailStatus === 'mail_error' && (
              <p style={{ color: 'var(--role-finance-dark)', marginTop: 8, fontSize: 13 }}>
                Email-ul nu a putut fi trimis automat. Copiază manual linkul de mai sus.
              </p>
            )}
          </div>
        )}

        {/* ── Cont ── */}
        <section id="cont" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
          <div style={SECTION_LABEL}>Cont</div>
          <div style={{ ...GLASS, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -80, right: -80,
              width: 240, height: 240, borderRadius: '50%',
              background: `radial-gradient(circle, ${user.roleColors.bg} 0%, transparent 65%)`,
              opacity: 0.7, pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              {/* Identitate */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                  {user.firstName} {user.lastName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999,
                    background: user.roleColors.bg, border: `1px solid ${user.roleColors.border}`,
                    fontSize: 11, fontWeight: 600, color: user.roleColors.text,
                  }}>
                    {user.roleDisplay}
                  </span>
                  {user.labelName && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.labelName}</span>
                  )}
                  <span style={{ fontSize: 12, color: 'rgba(200,198,188,0.35)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Membru din {new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(user.createdAt))}
                  </span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 0 24px' }} />

              {/* Form editare */}
              <ProfileForm
                user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, avatar: user.avatar }}
                initials={user.initials}
                gradient={user.gradient}
              />
            </div>
          </div>
        </section>

        {/* ── Securitate ── */}
        <section id="securitate" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
          <div style={SECTION_LABEL}>Securitate</div>
          <div style={GLASS}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 20px' }}>Schimbă parola</h3>
            <form action={changePasswordAction} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Parola actuală</label>
                <PasswordInput id="currentPassword" name="currentPassword" required className="form-input" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Parola nouă</label>
                <PasswordInput id="newPassword" name="newPassword" required className="form-input" minLength={8} />
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.5 }}>
                  Minim 8 caractere, o literă mare, o cifră și un caracter special.
                </p>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Confirmă parola nouă</label>
                <PasswordInput id="confirmPassword" name="confirmPassword" required className="form-input" minLength={8} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>Actualizează parola</button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Membri & Acces ── */}
        {canManageLabel && (
          <section id="membri" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
            <div style={SECTION_LABEL}>Membri & Acces</div>
            <div style={GLASS}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Echipa ({members.length})
                </h3>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setInviteOpen(true)}
                  style={{ fontSize: 12, height: 32, padding: '0 14px' }}
                >
                  + Invită membru
                </button>
              </div>

              {/* KPI per rol */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {MEMBER_ROLES.map((r) => {
                  const count = members.filter(m => m.role === r.value).length
                  const active = memberRoleFilter === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setMemberRoleFilter(active ? 'toate' : r.value)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        background: active ? r.bg : 'var(--bg-secondary)',
                        border: `1px solid ${active ? r.border : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 700, color: active ? r.color : 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                        {count}
                      </div>
                      <div style={{ fontSize: 11, color: active ? r.color : 'var(--text-secondary)', fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>
                        {r.label}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Member list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: invitations.length > 0 ? 20 : 0 }}>
                {filteredMembers.map((m) => {
                  const badge = ROLE_BADGE[m.role] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                  const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()
                  const isMe = m.id === currentUserId
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/uploads/avatars/${m.avatar}`} alt={m.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: badge.color }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.firstName} {m.lastName}
                          </span>
                          {isMe && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(155,148,240,0.1)', color: '#9B94F0', fontWeight: 600 }}>Tu</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{m.email}</div>
                      </div>
                      <span style={{ background: badge.bg, color: badge.color, border: `0.5px solid ${badge.color}4d`, fontSize: 11, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </div>
                  )
                })}
                {filteredMembers.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                    Niciun membru în această categorie.
                  </p>
                )}
              </div>

              {/* Pending invitations */}
              {invitations.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 10 }}>
                    Invitații în așteptare ({invitations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {invitations.map((inv) => {
                      const daysLeft = Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: 'rgba(253,230,138,0.04)', borderRadius: 10, border: '1px solid rgba(253,230,138,0.12)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{inv.email}</div>
                            <div style={{ fontSize: 11, color: daysLeft <= 1 ? '#fca5a5' : 'var(--text-secondary)', marginTop: 2 }}>
                              {ROLE_LABELS[inv.role] ?? inv.role} · expiră în {daysLeft} {daysLeft === 1 ? 'zi' : 'zile'}
                            </div>
                          </div>
                          <form action={revokeTeamInvitationAction}>
                            <input type="hidden" name="invitationId" value={inv.id} />
                            <button className="btn btn-sm btn-ghost" type="submit" style={{ fontSize: 11, color: '#fca5a5', padding: '4px 10px' }}>
                              Revocă
                            </button>
                          </form>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Invite modal */}
            {inviteOpen && (
              <Modal isOpen onClose={() => setInviteOpen(false)} title="Invită membru" size="sm">
                <form action={inviteTeamMemberAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input name="email" type="email" className="form-input" required placeholder="adresa@email.com" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select name="role" className="form-input form-select" defaultValue={ROLES.FINANCIAL}>
                      <option value={ROLES.FINANCIAL}>Departament Financiar</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Trimite invitație</button>
                </form>
              </Modal>
            )}
          </section>
        )}

        {/* ── Label info ── */}
        {canManageLabel && label && (
          <section id="label-info" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
            <div style={SECTION_LABEL}>Label</div>
            <div style={GLASS}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 20px' }}>Informații label</h3>
              <form action={updateLabelAction} style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="s-name">Nume label *</label>
                  <input id="s-name" name="name" className="form-input" defaultValue={label.name} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="s-country">Țară *</label>
                    <input id="s-country" name="country" className="form-input" defaultValue={label.country} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="s-city">Oraș *</label>
                    <input id="s-city" name="city" className="form-input" defaultValue={label.city} required />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="s-genre">Gen muzical principal *</label>
                  <input id="s-genre" name="genre" className="form-input" defaultValue={label.genre} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="s-logo">Logo (PNG / SVG / JPG)</label>
                  {label.logo && (
                    <img src={label.logo} alt="Logo curent" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, marginBottom: 10, background: 'var(--bg-tertiary)', padding: 6, display: 'block' }} />
                  )}
                  <input id="s-logo" name="logo" type="file" className="form-input" accept="image/png,image/svg+xml,image/jpeg" style={{ padding: '7px 12px', cursor: 'pointer' }} />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>Salvează modificările</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ── Abonament ── */}
        {canManageLabel && label && (
          <section id="abonament" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
            <div style={SECTION_LABEL}>Abonament</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div style={GLASS}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>Plan curent</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    padding: '6px 20px', borderRadius: 20, fontSize: 15, fontWeight: 700,
                    background: 'rgba(155,148,240,0.08)', color: planColor, border: `1px solid ${planColor}40`,
                  }}>
                    {PLAN_LABELS[label.plan] ?? label.plan}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  {PLAN_DESCRIPTIONS[label.plan] ?? ''}
                </p>
                {label.planExpiry && (
                  <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Expiră: <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(label.planExpiry).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </strong>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,198,188,0.40)', marginBottom: 10 }}>
                  Ce include planul tău
                </div>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
                  {(PLAN_FEATURES[label.plan] ?? []).map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: planColor, flexShrink: 0, display: 'inline-block' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {label.plan !== 'ENTERPRISE' && (
                <div style={{ ...GLASS, background: 'rgba(155,148,240,0.04)', border: '1px solid rgba(155,148,240,0.12)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Upgrade plan</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                    Trimite o cerere echipei SoundLedger și te contactăm cu o ofertă personalizată.
                  </p>
                  <form action={requestUpgradeAction} style={{ display: 'grid', gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="up-plan">Plan dorit *</label>
                      <select id="up-plan" name="desiredPlan" className="form-select" required>
                        {label.plan === 'FREE_TRIAL' && <option value="INDIE">Indie</option>}
                        {(label.plan === 'FREE_TRIAL' || label.plan === 'INDIE') && <option value="PRO">Pro</option>}
                        <option value="ENTERPRISE">Enterprise</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="up-msg">Mesaj (opțional)</label>
                      <textarea id="up-msg" name="message" className="form-input" rows={3}
                        placeholder="Ex: avem 5 utilizatori, ne interesează funcțiile enterprise..."
                        style={{ resize: 'none' }} />
                    </div>
                    <div>
                      <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>Trimite cererea</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Protecție AI / Opt-Out ── */}
        {canOptOut && (
          <section id="protectie-ai" style={{ scrollMarginTop: 88, marginBottom: 28 }}>
            <style>{`
              @media print {
                header, nav, .no-print { display: none !important; }
                body { background: white !important; color: black !important; }
                .print-doc { background: white !important; color: black !important; border: 1px solid #ccc !important; }
              }
            `}</style>

            <div style={SECTION_LABEL}>Protecție AI</div>

            {/* Status banner */}
            <div style={{ ...GLASS, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }} className="no-print">
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>
                  {isOptOutActive ? 'Opt-Out activ' : isOptOutRevoked ? 'Opt-Out revocat' : 'Nicio declarație emisă'}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isOptOutActive
                    ? `Cod: ${optOut!.declarationCode} · Emis: ${new Date(optOut!.issuedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })} · Acoperă ${tracksCount} piese`
                    : isOptOutRevoked
                    ? `Revocat pe ${new Date(optOut!.revokedAt!).toLocaleDateString('ro-RO')}${optOut!.revokedReason ? ` — ${optOut!.revokedReason}` : ''}`
                    : 'Catalogul tău nu este protejat împotriva antrenării AI. Emite o declarație de Opt-Out.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {isOptOutActive && <PrintButton />}
                {isOptOutActive && canOptOut && (
                  <form action={revokeOptOutDeclarationAction}>
                    <button type="submit" className="btn btn-ghost btn-sm"
                      onMouseEnter={() => setRevokeHover(true)}
                      onMouseLeave={() => setRevokeHover(false)}
                      style={{ color: revokeHover ? '#fca5a5' : 'var(--text-secondary)', fontSize: 12, transition: 'color 0.15s' }}>
                      Revocă declarația
                    </button>
                  </form>
                )}
              </div>
            </div>

            {isOptOutActive && optOut ? (
              <div className="card print-doc" style={{ padding: '32px 40px' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Declarație oficială · {optOut.declarationCode}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>
                    Declarație de Opt-Out privind utilizarea muzicii în sisteme de Inteligență Artificială
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                    Emisă conform EU AI Act, Art. 4(3) și Directivei UE 2019/790
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 16, fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                  <p>Prin prezenta declarație exercită în mod explicit dreptul de <strong style={{ color: 'var(--text-primary)' }}>opt-out</strong> față de orice utilizare a operelor muzicale din catalogul său în scopul antrenării, ajustării sau evaluării sistemelor de Inteligență Artificială.</p>
                  <p>Această declarație acoperă <strong style={{ color: 'var(--text-primary)' }}>întregul catalog</strong>, compus din <strong style={{ color: 'var(--text-primary)' }}>{tracksCount} înregistrări muzicale</strong>, inclusiv piesele adăugate ulterior datei prezentei declarații.</p>
                  <p>Orice utilizare a operelor protejate fără obținerea prealabilă a unei licențe explicite constituie o încălcare a drepturilor de autor și va face obiectul unor demersuri juridice în temeiul legislației europene și naționale aplicabile.</p>
                  {optOut.notes && (
                    <p style={{ borderLeft: '3px solid rgba(155,148,240,0.4)', paddingLeft: 14, color: 'var(--text-primary)' }}>
                      <em>Note suplimentare:</em> {optOut.notes}
                    </p>
                  )}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, fontSize: 13 }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data emiterii</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(optOut.issuedAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cod referință</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{optOut.declarationCode}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temei legal</div>
                      <div style={{ color: 'var(--text-primary)' }}>{optOut.legalBasis}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              canOptOut && (
                <div style={GLASS} className="no-print">
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>Emite declarație de Opt-Out</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                    Declarația va acoperi automat toate cele <strong>{tracksCount}</strong> piese din catalogul tău și va genera un document formal cu forță juridică în UE.
                  </p>
                  <form action={issueOptOutDeclarationAction} style={{ display: 'grid', gap: 16, maxWidth: 500 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="notes">Note suplimentare (opțional)</label>
                      <textarea id="notes" name="notes" className="form-input" rows={3}
                        placeholder="ex: Catalogul include piese sub licențe exclusive..."
                        style={{ resize: 'none' }} />
                    </div>
                    <div>
                      <button type="submit" style={{
                        background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
                        color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        Emite declarație Opt-Out
                      </button>
                    </div>
                  </form>
                </div>
              )
            )}

            <div style={{ ...GLASS, marginTop: 16, background: 'rgba(155,148,240,0.04)', border: '1px solid rgba(155,148,240,0.12)' }} className="no-print">
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Ce înseamnă această declarație?</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
                <li>Conform <strong style={{ color: 'var(--text-primary)' }}>EU AI Act Art. 4(3)</strong>, titularii de drepturi pot interzice explicit utilizarea operelor lor pentru antrenament AI</li>
                <li>Declarația reprezintă dovada formală și poate fi utilizată în litigii sau notificări oficiale</li>
                <li>Nu împiedică platformele să ignore declarația — dar creează un <strong style={{ color: 'var(--text-primary)' }}>precedent juridic</strong> în favoarea ta</li>
                <li>Pentru protecție maximă, trimite documentul descărcat direct companiilor AI și OGC-urilor (UCMR-ADA, UPFR)</li>
              </ul>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
