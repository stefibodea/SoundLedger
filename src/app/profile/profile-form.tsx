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
}

export function ProfileForm({ user }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setOpen(true)}
          className="btn btn-secondary"
          style={{ fontSize: 13 }}
        >
          Editează profilul
        </button>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 24,
      padding: 20,
      borderRadius: 10,
      background: 'var(--bg-tertiary)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Editează profilul
        </h3>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 18,
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          ×
        </button>
      </div>

      <form action={updateProfileAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Prenume</label>
            <input
              className="form-input"
              type="text"
              name="firstName"
              defaultValue={user.firstName}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nume</label>
            <input
              className="form-input"
              type="text"
              name="lastName"
              defaultValue={user.lastName}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            name="email"
            defaultValue={user.email}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Fotografie profil</label>
          <input
            className="form-input"
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            style={{ padding: '6px 10px' }}
          />
          {user.avatar && (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              Lasă gol pentru a păstra fotografia actuală.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>
            Salvează modificările
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
          >
            Anulează
          </button>
        </div>
      </form>
    </div>
  )
}
