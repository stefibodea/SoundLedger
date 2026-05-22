'use client'

import { useState, useRef } from 'react'
import { inviteTeamMemberAction, updateMemberAvatarAction } from '@/app/actions/team'
import { ROLES, ROLE_LABELS } from '@/lib/roles'

export type MemberRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
}

export type DepartmentGroup = {
  key: string
  label: string
  members: MemberRow[]
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.15)', color: '#9B94F0' },
  AR_MANAGER:    { bg: 'rgba(110,231,183,0.15)', color: '#6ee7b7' },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.15)', color: '#fde68a' },
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.15)', color: '#fca5a5' },
}

const ROLE_BAR_COLOR: Record<string, string> = {
  LABEL_MANAGER: '#9B94F0',
  AR_MANAGER:    '#6ee7b7',
  FINANCIAL:     '#fde68a',
  SUPER_ADMIN:   '#fca5a5',
}

const ROLE_GRADIENT: Record<string, string> = {
  LABEL_MANAGER: 'linear-gradient(135deg, #1e1b35, #2d1b69)',
  AR_MANAGER:    'linear-gradient(135deg, #0d2b1e, #1a4a35)',
  FINANCIAL:     'linear-gradient(135deg, #2b2200, #4a3a00)',
  SUPER_ADMIN:   'linear-gradient(135deg, #2b0f0f, #4a1a1a)',
}

function MemberCard({
  member,
  canManage,
  currentUserId,
}: {
  member: MemberRow
  canManage: boolean
  currentUserId: string
}) {
  const [hovered, setHovered] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const badge = ROLE_BADGE[member.role] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
  const barColor = ROLE_BAR_COLOR[member.role] ?? 'transparent'
  const gradient = ROLE_GRADIENT[member.role] ?? 'linear-gradient(135deg, #1e1b35, #2d1b69)'
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()
  const isCurrentUser = member.id === currentUserId

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(155,148,240,0.15)' : 'none',
      }}
    >
      {/* Zona foto */}
      <div style={{ position: 'relative', aspectRatio: '3/4' }}>
        {member.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/uploads/avatars/${member.avatar}`}
            alt={`${member.firstName} ${member.lastName}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '2rem', fontWeight: 700, color: `${badge.color}cc` }}>
              {initials}
            </span>
          </div>
        )}

        {/* Overlay upload */}
        {canManage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            <form ref={formRef} action={updateMemberAvatarAction}>
              <input type="hidden" name="userId" value={member.id} />
              <input
                ref={inputRef}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={() => formRef.current?.requestSubmit()}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  inputRef.current?.click()
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                📷 Schimbă poza
              </button>
            </form>
          </div>
        )}

        {/* Bara colorată */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: barColor,
          }}
        />
      </div>

      {/* Zona info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {member.firstName} {member.lastName}
          </span>
          {isCurrentUser && (
            <span
              style={{
                background: 'rgba(155,148,240,0.1)',
                color: '#9B94F0',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              Tu
            </span>
          )}
        </div>
        <span
          style={{
            display: 'inline-block',
            background: badge.bg,
            color: badge.color,
            border: `0.5px solid ${badge.color}4d`,
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      </div>
    </div>
  )
}

export function TeamPageClient({
  departments,
  canManage,
  currentUserId,
}: {
  departments: DepartmentGroup[]
  canManage: boolean
  currentUserId: string
}) {
  return (
    <div>
      {/* Formular invitație compact */}
      {canManage && (
        <div className="card" style={{ marginBottom: 24, padding: '14px 16px' }}>
          <form
            action={inviteTeamMemberAction}
            style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <input
              name="email"
              type="email"
              className="form-input"
              placeholder="Email nou membru"
              required
              style={{ flex: '1 1 200px', minWidth: 0 }}
            />
            <select
              name="role"
              className="form-input form-select"
              defaultValue={ROLES.AR_MANAGER}
              style={{ flex: '0 0 auto', width: 180 }}
            >
              <option value={ROLES.AR_MANAGER}>A&R Manager</option>
              <option value={ROLES.FINANCIAL}>Departament Financiar</option>
              <option value={ROLES.ARTIST}>Artist</option>
            </select>
            <button className="btn btn-primary btn-sm" type="submit" style={{ flexShrink: 0 }}>
              Invită
            </button>
          </form>
        </div>
      )}

      {/* Secțiuni departamente */}
      {departments.map((dept) => (
        <div key={dept.key} style={{ marginBottom: 36 }}>
          {/* Separator departament */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {dept.label}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11, opacity: 0.6 }}>
              ({dept.members.length})
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          </div>

          {/* Grid carduri */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {dept.members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                canManage={canManage}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      ))}

      {departments.length === 0 && (
        <div
          className="card"
          style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}
        >
          Niciun membru în echipă.
        </div>
      )}
    </div>
  )
}
