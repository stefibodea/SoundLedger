import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ResetPasswordForm } from './reset-password-form'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  let tokenInvalid = false

  if (token) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      tokenInvalid = true
    }
  }

  const showError = error || (!token && !error) || tokenInvalid

  return (
    <main style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#1a1528' }}>

      {/* ── STÂNGA — VIDEO 75% ── */}
      <div className="rp-video-col" style={{ flex: 3, position: 'relative', overflow: 'hidden' }}>
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, rgba(26,21,40,0.97) 100%)', zIndex: 1 }} />
      </div>

      {/* ── DREAPTA — FORMULAR 25% ── */}
      <div
        className="rp-form-col"
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
        <div style={{ position: 'absolute', top: -120, right: -80, width: 350, height: 350, background: 'radial-gradient(circle, rgba(155,148,240,0.15) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <img src="/LOGO/logo3.svg" alt="SoundLedger" height={200} style={{ objectFit: 'contain', display: 'block' }} />
          </div>

          {showError ? (
            /* ── Eroare token ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(252,165,165,0.12)', border: '2px solid rgba(252,165,165,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 20px',
              }}>
                ✕
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0efe8', marginBottom: 10 }}>
                Link invalid
              </h1>
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 24, lineHeight: 1.5 }}>
                {error
                  ? decodeURIComponent(error.replace(/\+/g, ' '))
                  : 'Acest link de resetare este invalid sau a expirat.'}
              </p>
              <Link
                href="/forgot-password"
                style={{
                  display: 'inline-block',
                  padding: '11px 20px',
                  background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Solicită un nou link
              </Link>
            </div>
          ) : (
            /* ── Formular parolă nouă ── */
            <>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0efe8', marginBottom: 6 }}>
                Setează o parolă nouă
              </h1>
              <p style={{ fontSize: 13, color: '#c8c6bc', marginBottom: 24 }}>
                Parola trebuie să aibă minim 8 caractere.
              </p>

              <ResetPasswordForm token={token!} />
            </>
          )}
        </div>
      </div>

      <style>{`
        .rp-btn {
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
          transition: opacity 0.2s ease, transform 0.15s ease;
        }
        .rp-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .rp-video-col { display: none !important; }
          .rp-form-col { flex: 1 !important; min-width: 0 !important; min-height: 100vh; }
        }
      `}</style>
    </main>
  )
}
