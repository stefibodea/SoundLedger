import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { changePasswordAction } from '@/app/actions/auth'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireSession()
  const { error } = await searchParams

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { mustResetPassword: true, firstName: true } })
  if (!user?.mustResetPassword) redirect('/dashboard')

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1528' }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'linear-gradient(160deg, #1c1b22 0%, #1e1b35 40%, #1a1b3a 100%)',
        borderRadius: 16,
        padding: '48px 40px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/LOGO/logo3.svg" alt="SoundLedger" height={80} style={{ objectFit: 'contain', display: 'block', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0efe8', marginBottom: 8 }}>
            Schimbă parola
          </h1>
          <p style={{ fontSize: 14, color: '#c8c6bc', lineHeight: 1.5 }}>
            Contul tău necesită o parolă nouă înainte de a continua.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(252,165,165,0.1)', border: '1px solid rgba(252,165,165,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
            {decodeURIComponent(error.replace(/\+/g, ' '))}
          </div>
        )}

        <form action={changePasswordAction}>
          <label htmlFor="newPassword" style={{ fontSize: 13, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
            Parolă nouă
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            required
            minLength={8}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 0, display: 'block' }}
          />
          <p style={{ fontSize: 12, color: 'rgba(200,198,188,0.7)', marginBottom: 20, lineHeight: 1.5 }}>
            Minim 8 caractere, o literă mare, o cifră și un caracter special.
          </p>

          <label htmlFor="confirmPassword" style={{ fontSize: 13, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
            Confirmă parola
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 24, display: 'block' }}
          />

          <button
            type="submit"
            style={{ width: '100%', padding: 13, background: 'linear-gradient(135deg, #9B94F0, #6366f1)', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            Salvează parola
          </button>
        </form>
      </div>
    </main>
  )
}
