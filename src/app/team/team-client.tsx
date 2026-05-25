'use client'

import { useState, useRef } from 'react'
import { inviteTeamMemberAction, updateMemberAvatarAction, addComposerAction, removeComposerAction, updateComposerPhotoAction } from '@/app/actions/team'
import { ROLES, ROLE_LABELS } from '@/lib/roles'
import { Modal } from '@/components/ui/Modal'

export type MemberRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
}

export type ComposerRow = {
  id: string
  name: string
  email: string | null
  specialization: string | null
  photo: string | null
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.15)', color: '#9B94F0' },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.15)', color: '#fde68a' },
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.15)', color: '#fca5a5' },
}

const ROLE_BAR_COLOR: Record<string, string> = {
  LABEL_MANAGER: '#9B94F0',
  FINANCIAL:     '#fde68a',
  SUPER_ADMIN:   '#fca5a5',
}

const ROLE_GRADIENT: Record<string, string> = {
  LABEL_MANAGER: 'linear-gradient(135deg, #1e1b35, #2d1b69)',
  FINANCIAL:     'linear-gradient(135deg, #2b2200, #4a3a00)',
  SUPER_ADMIN:   'linear-gradient(135deg, #2b0f0f, #4a1a1a)',
}

type ModalTab = 'invite' | 'composer'

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
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
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
                Schimbă poza
              </button>
            </form>
          </div>
        )}

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

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<ModalTab | null>(null)

  return (
    <Modal isOpen onClose={onClose} title="Adaugă membru" size="sm">
      {/* Selector tip */}
      {!tab && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={() => setTab('invite')}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '16px 18px',
              background: 'rgba(253,230,138,0.05)',
              border: '1px solid rgba(253,230,138,0.18)',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(253,230,138,0.1)'
              e.currentTarget.style.borderColor = 'rgba(253,230,138,0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(253,230,138,0.05)'
              e.currentTarget.style.borderColor = 'rgba(253,230,138,0.18)'
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>✉️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fde68a', marginBottom: 3 }}>
                Invitație departament financiar
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Trimite un link de activare unui nou membru al echipei financiare
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab('composer')}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '16px 18px',
              background: 'rgba(155,148,240,0.05)',
              border: '1px solid rgba(155,148,240,0.18)',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(155,148,240,0.1)'
              e.currentTarget.style.borderColor = 'rgba(155,148,240,0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(155,148,240,0.05)'
              e.currentTarget.style.borderColor = 'rgba(155,148,240,0.18)'
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}></span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#9B94F0', marginBottom: 3 }}>
                Compozitor angajat
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Adaugă un compozitor al labelului — apare ca opțiune în declarațiile AI per piesă
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Formular invitație */}
      {tab === 'invite' && (
        <div>
          <button
            type="button"
            onClick={() => setTab(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: '0 0 14px', fontFamily: 'inherit' }}
          >
            Înapoi
          </button>
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
        </div>
      )}

      {/* Formular compozitor */}
      {tab === 'composer' && (
        <div>
          <button
            type="button"
            onClick={() => setTab(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: '0 0 14px', fontFamily: 'inherit' }}
          >
            Înapoi
          </button>
          <form action={addComposerAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nume *</label>
              <input name="name" className="form-input" required placeholder="ex: Ion Popescu" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" placeholder="optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Specializare</label>
              <input name="specialization" className="form-input" placeholder="ex: Compoziție melodică, Versuri, Producție" />
            </div>
            <button type="submit" className="btn btn-primary">Adaugă compozitor</button>
          </form>
        </div>
      )}
    </Modal>
  )
}

function ComposerCard({ composer, canManage }: { composer: ComposerRow; canManage: boolean }) {
  const [hovered, setHovered] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = composer.name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase()

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
        boxShadow: hovered ? '0 12px 40px rgba(155,148,240,0.1)' : 'none',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '3/4' }}>
        {composer.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/uploads/composers/${composer.photo}`}
            alt={composer.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1a2035, #0f2040)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'rgba(155,148,240,0.6)' }}>{initials}</span>
          </div>
        )}

        {/* Overlay hover: upload + remove */}
        {canManage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            <form ref={formRef} action={updateComposerPhotoAction}>
              <input type="hidden" name="composerId" value={composer.id} />
              <input
                ref={inputRef}
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={() => formRef.current?.requestSubmit()}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  padding: '7px 14px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  fontFamily: 'inherit',
                }}
              >
                Schimbă poza
              </button>
            </form>
            <form action={removeComposerAction}>
              <input type="hidden" name="composerId" value={composer.id} />
              <button
                type="submit"
                style={{
                  background: 'rgba(252,165,165,0.12)',
                  border: '1px solid rgba(252,165,165,0.3)',
                  borderRadius: 8,
                  color: '#fca5a5',
                  fontSize: 12,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  fontFamily: 'inherit',
                }}
                onClick={(e) => { if (!confirm(`Elimini compozitorul "${composer.name}"?`)) e.preventDefault() }}
              >
                Elimină
              </button>
            </form>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(155,148,240,0.4)' }} />
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {composer.name}
        </div>
        <span
          style={{
            display: 'inline-block',
            background: 'rgba(155,148,240,0.1)',
            color: 'rgba(155,148,240,0.8)',
            border: '0.5px solid rgba(155,148,240,0.25)',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {composer.specialization ?? 'Compozitor'}
        </span>
      </div>
    </div>
  )
}

export function TeamPageClient({
  members,
  composers,
  canManage,
  currentUserId,
}: {
  members: MemberRow[]
  composers: ComposerRow[]
  canManage: boolean
  currentUserId: string
}) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      {/* Header acțiuni */}
      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            + Adaugă membru
          </button>
        </div>
      )}

      {/* Grid membri + compozitori — plat */}
      {members.length === 0 && composers.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}
        >
          Niciun membru în echipă.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              canManage={canManage}
              currentUserId={currentUserId}
            />
          ))}
          {composers.map((composer) => (
            <ComposerCard
              key={composer.id}
              composer={composer}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {modalOpen && <AddMemberModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
