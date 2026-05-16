import Link from 'next/link'
import { requestPasswordResetAction } from '@/app/actions/password-reset'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { sent, error } = await searchParams

  return (
    <main style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#1a1528' }}>

      {/* ── STÂNGA — VIDEO 75% ── */}
      <div className="fp-video-col" style={{ flex: 3, position: 'relative', overflow: 'hidden' }}>
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
        className="fp-form-col"
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

          {sent === '1' ? (
            /* ── Confirmare trimitere ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, margin: '0 auto 20px',
              }}>
                ✉
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0efe8', marginBottom: 10 }}>
                Email trimis!
              </h1>
              <p style={{ fontSize: 14, color: '#c8c6bc', lineHeight: 1.6, marginBottom: 8 }}>
                Am trimis un link de resetare la adresa ta de email. Verifică și folderul Spam.
              </p>
              <p style={{ fontSize: 13, color: 'rgba(200,198,188,0.6)', marginBottom: 28 }}>
                Link-ul expiră în 1 oră.
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #9B94F0 0%, #38bdf8 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              >
                Înapoi la autentificare
              </Link>
            </div>
          ) : (
            /* ── Formular ── */
            <>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0efe8', marginBottom: 6 }}>
                Ai uitat parola?
              </h1>
              <p style={{ fontSize: 13, color: '#c8c6bc', marginBottom: 24, lineHeight: 1.5 }}>
                Introdu adresa de email și îți trimitem un link de resetare.
              </p>

              {error && (
                <div style={{ background: 'rgba(252,165,165,0.1)', border: '1px solid rgba(252,165,165,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 14 }}>
                  {decodeURIComponent(error.replace(/\+/g, ' '))}
                </div>
              )}

              <form action={requestPasswordResetAction}>
                <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  id="email" name="email" type="email" required
                  className="fp-input"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 20, display: 'block' }}
                />

                <button type="submit" className="fp-btn">
                  Trimite link de resetare
                </button>
              </form>

              <p style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
                <Link href="/login" style={{ color: '#9B94F0', textDecoration: 'none' }}>
                  ← Înapoi la autentificare
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        .fp-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .fp-input:focus {
          border-color: #67e8f9 !important;
          background: rgba(103,232,249,0.05) !important;
          box-shadow: 0 0 0 3px rgba(103,232,249,0.18), 0 0 12px rgba(103,232,249,0.12);
        }
        .fp-btn {
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
        .fp-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .fp-video-col { display: none !important; }
          .fp-form-col { flex: 1 !important; min-width: 0 !important; min-height: 100vh; }
        }
      `}</style>
    </main>
  )
}
