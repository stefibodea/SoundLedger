'use client'

import { useState } from 'react'
import { updateProfileAction } from '@/app/actions/profile'

type Props = {
  user: {
    firstName: string
    lastName: string
    email: string
    avatar: string | null
  }
  initials: string
  gradient: string
}

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  color: 'rgba(200,198,188,0.45)',
  marginBottom: 5,
}

const FIELD_VALUE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-primary)',
}

export function ProfileForm({ user, initials, gradient }: Props) {
  const [open,        setOpen]        = useState(false)
  const [avatarHover, setAvatarHover] = useState(false)
  const [btnHover,    setBtnHover]    = useState(false)

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

      {/* ── Stânga: avatar + buton ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <div
          onClick={() => setOpen(true)}
          onMouseEnter={() => setAvatarHover(true)}
          onMouseLeave={() => setAvatarHover(false)}
          style={{
            position: 'relative',
            width: 96, height: 96, borderRadius: '50%',
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, color: 'white',
            flexShrink: 0, overflow: 'hidden', cursor: 'pointer',
            boxShadow: avatarHover
              ? '0 0 0 3px rgba(155,148,240,0.55), 0 8px 24px rgba(0,0,0,0.3)'
              : '0 0 0 3px rgba(155,148,240,0.15), 0 4px 12px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {user.avatar
            ? <img src={`/uploads/avatars/${user.avatar}`} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}

          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.52)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: avatarHover ? 1 : 0,
            transition: 'opacity 0.2s ease',
            gap: 5,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ fontSize: 10, color: 'white', fontWeight: 700, letterSpacing: '0.05em' }}>Schimbă</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            background: btnHover ? 'rgba(155,148,240,0.15)' : 'rgba(155,148,240,0.08)',
            border: `1px solid ${btnHover ? 'rgba(155,148,240,0.35)' : 'rgba(155,148,240,0.18)'}`,
            borderRadius: 8,
            color: 'var(--primary)',
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 16px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          Editează profilul
        </button>
      </div>

      {/* ── Dreapta: info sau form ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!open ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 32px', paddingTop: 4 }}>
            <div>
              <div style={FIELD_LABEL}>Prenume</div>
              <div style={FIELD_VALUE}>{user.firstName}</div>
            </div>
            <div>
              <div style={FIELD_LABEL}>Nume</div>
              <div style={FIELD_VALUE}>{user.lastName}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={FIELD_LABEL}>Email</div>
              <div style={FIELD_VALUE}>{user.email}</div>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(16,14,28,0.60)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(155,148,240,0.12)',
            borderRadius: 12,
            padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Editează profilul</span>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >×</button>
            </div>

            <form action={updateProfileAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Prenume</label>
                  <input className="form-input" type="text" name="firstName" defaultValue={user.firstName} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nume</label>
                  <input className="form-input" type="text" name="lastName" defaultValue={user.lastName} required />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" defaultValue={user.email} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fotografie profil</label>
                <input className="form-input" type="file" name="avatar" accept="image/jpeg,image/png,image/webp" style={{ padding: '6px 10px' }} />
                {user.avatar && (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Lasă gol pentru a păstra fotografia actuală.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>Salvează</button>
                <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" style={{ fontSize: 13 }}>Anulează</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
