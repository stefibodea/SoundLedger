import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default function RegisterPage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%', overflow: 'hidden', background: '#1a1528' }}>

      {/* ── STÂNGA — VIDEO 75% ── */}
      <div className="register-video-col" style={{ flex: 3, position: 'relative', overflow: 'hidden' }}>
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
        className="register-form-col"
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
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 320, marginTop: -130 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, position: 'relative', top: 40 }}>
            <img src="/LOGO/logo3.svg" alt="SoundLedger" height={200} style={{ objectFit: 'contain', display: 'block' }} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0efe8', marginBottom: 6 }}>
            Creează un cont
          </h1>
          <p style={{ fontSize: 13, color: '#c8c6bc', marginBottom: 20 }}>
            Înregistrează-ți casa de discuri pe SoundLedger
          </p>

          <form action={registerAction}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="labelName" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Nume label</label>
                <input id="labelName" name="labelName" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
              <div>
                <label htmlFor="genre" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Gen principal</label>
                <input id="genre" name="genre" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="country" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Țară</label>
                <input id="country" name="country" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
              <div>
                <label htmlFor="city" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Oraș</label>
                <input id="city" name="city" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label htmlFor="firstName" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Prenume</label>
                <input id="firstName" name="firstName" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
              <div>
                <label htmlFor="lastName" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Nume</label>
                <input id="lastName" name="lastName" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />
              </div>
            </div>

            <label htmlFor="email" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Email</label>
            <input id="email" name="email" type="email" required className="register-input" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block' }} />

            <label htmlFor="password" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Parolă</label>
            <PasswordInput
              id="password" name="password" minLength={8} required
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 4, display: 'block' }}
            />
            <p style={{ fontSize: 12, color: 'rgba(200,198,188,0.6)', marginBottom: 12, lineHeight: 1.4 }}>
              Minim 8 caractere, o literă mare, o cifră și un caracter special.
            </p>

            <label htmlFor="plan" style={{ fontSize: 12, fontWeight: 500, color: '#c8c6bc', display: 'block', marginBottom: 6 }}>Plan</label>
            <select
              id="plan" name="plan" defaultValue="FREE_TRIAL"
              className="register-input"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#f0efe8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12, display: 'block', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="FREE_TRIAL" style={{ background: '#1e1b35', color: '#f0efe8' }}>Gratuit</option>
              <option value="PRO" style={{ background: '#1e1b35', color: '#f0efe8' }}>Pro</option>
              <option value="ENTERPRISE" style={{ background: '#1e1b35', color: '#f0efe8' }}>Enterprise</option>
            </select>

            <button type="submit" className="register-btn" style={{ marginTop: 28 }}>
              Creează contul
            </button>
          </form>

          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#c8c6bc' }}>
            Ai deja cont?{' '}
            <Link href="/login" className="register-link">
              Intră în cont
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .register-input {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .register-input:focus {
          border-color: #67e8f9 !important;
          background: rgba(103,232,249,0.05) !important;
          box-shadow: 0 0 0 3px rgba(103,232,249,0.18), 0 0 12px rgba(103,232,249,0.12);
        }
        .register-btn {
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
        .register-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .register-link:hover {
          text-decoration: underline;
        }
        @media (max-width: 768px) {
          .register-video-col { display: none !important; }
          .register-form-col { flex: 1 !important; min-width: 0 !important; min-height: 100vh; }
        }
      `}</style>
    </main>
  )
}
