import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import { prisma } from '@/lib/prisma'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const emails = await prisma.user.findMany({ select: { email: true }, orderBy: { email: 'asc' } })

  return (
    <main style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#1a1528' }}>

      {/* ── STÂNGA — VIDEO 75% ── */}
      <div className="login-video-col" style={{ flex: 3, position: 'relative', overflow: 'hidden' }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          <source src="/videos/video.webm" type="video/webm" />
          <source src="/videos/video.mp4" type="video/mp4" />
        </video>

        {/* Gradient fade spre formular */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, rgba(26,21,40,0.97) 100%)', zIndex: 1 }} />

      </div>

      {/* ── DREAPTA — FORMULAR 25% ── */}
      <div
        className="login-form-col"
        style={{
          flex: 1,
          minWidth: 360,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
          background: 'linear-gradient(160deg, #1c1b22 0%, #1e1b35 50%, #1a1b3a 100%)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
        }}
      >
        {/* Blobs decorative */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 350, height: 350, background: 'radial-gradient(circle, rgba(155,148,240,0.15) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Conținut */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 320, marginTop: -140 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <img src="/LOGO/logo3.svg" alt="SoundLedger" height={200} style={{ objectFit: 'contain', display: 'block' }} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0efe8', marginBottom: 6 }}>
            Bine ai revenit!
          </h1>
          <p style={{ fontSize: 13, color: '#c8c6bc', marginBottom: 28 }}>
            Intră în contul tău SoundLedger
          </p>

          {error && (
            <div style={{ background: 'rgba(252,165,165,0.1)', border: '1px solid rgba(252,165,165,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 14 }}>
              {decodeURIComponent(error.replace(/\+/g, ' '))}
            </div>
          )}

          <form action={loginAction}>
            <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              id="email" name="email" type="email" required list="email-suggestions"
              className="login-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 14, display: 'block' }}
            />
            <datalist id="email-suggestions">
              {emails.map((u) => <option key={u.email} value={u.email} />)}
            </datalist>

            <label htmlFor="password" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
              Parolă
            </label>
            <PasswordInput
              id="password" name="password" required
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 6, display: 'block' }}
            />
            <Link href="/forgot-password" style={{ fontSize: 13, color: '#9B94F0', textDecoration: 'none', display: 'block', textAlign: 'right', marginBottom: 14 }}>
              Ai uitat parola?
            </Link>

            <button type="submit" className="login-btn">
              Intră în cont
            </button>
          </form>

          <p style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: '#c8c6bc' }}>
            Nu ai cont?{' '}
            <Link href="/register" className="login-link">
              Creează unul
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .login-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .login-input:focus {
          border-color: #67e8f9 !important;
          background: rgba(103,232,249,0.05) !important;
          box-shadow: 0 0 0 3px rgba(103,232,249,0.18), 0 0 12px rgba(103,232,249,0.12);
        }
        .login-btn {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          margin-top: 6px;
          transition: opacity 0.2s ease, transform 0.15s ease;
        }
        .login-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .login-link:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .login-video-col { display: none !important; }
          .login-form-col { flex: 1 !important; min-width: 0 !important; min-height: 100vh; }
        }
      `}</style>
    </main>
  )
}
