import { requireSession } from '@/lib/auth-guards'
import { logoutAction } from '@/app/actions/auth'

export default async function SuspendedPage() {
  await requireSession()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}></div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#fca5a5' }}>
          Cont suspendat
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>
          Casa de discuri din care faci parte a fost suspendată de administratorul platformei.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
          Dacă crezi că este o eroare, contactează administratorul la{' '}
          <a href="mailto:admin@soundledger.io" style={{ color: 'var(--primary)' }}>
            admin@soundledger.io
          </a>
          .
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ color: 'var(--text-primary)' }}
          >
            Deconectează-te
          </button>
        </form>
      </div>
    </div>
  )
}
