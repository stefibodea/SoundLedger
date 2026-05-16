'use client'

import { useState } from 'react'
import { resetPasswordAction } from '@/app/actions/password-reset'
import { PasswordInput } from '@/components/ui/PasswordInput'

export function ResetPasswordForm({ token }: { token: string }) {
  const [mismatch, setMismatch] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const pw = (form.elements.namedItem('newPassword') as HTMLInputElement).value
    const cpw = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    if (pw !== cpw) {
      e.preventDefault()
      setMismatch(true)
    } else {
      setMismatch(false)
    }
  }

  return (
    <form action={resetPasswordAction} onSubmit={handleSubmit}>
      <input type="hidden" name="token" value={token} />

      <label htmlFor="newPassword" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
        Parolă nouă
      </label>
      <PasswordInput
        id="newPassword" name="newPassword" required minLength={8}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 14, display: 'block' }}
      />

      <label htmlFor="confirmPassword" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
        Confirmă parola
      </label>
      <PasswordInput
        id="confirmPassword" name="confirmPassword" required minLength={8}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: mismatch ? 6 : 20, display: 'block' }}
      />

      {mismatch && (
        <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 14 }}>Parolele nu coincid.</p>
      )}

      <button type="submit" className="rp-btn">
        Salvează parola nouă
      </button>
    </form>
  )
}
