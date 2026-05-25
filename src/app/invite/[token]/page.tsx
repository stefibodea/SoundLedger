import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { acceptInvitationAction } from '@/app/actions/invitations'
import { ROLE_LABELS } from '@/lib/roles'

type InvitePageProps = {
  params: Promise<{ token: string }>
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  AR_MANAGER: 'Vei putea gestiona prospecții A&R, evalua artiști noi și urmări pipeline-ul de semnare.',
  FINANCIAL: 'Vei avea acces la venituri, plăți royalty și rapoarte financiare ale label-ului.',

  LABEL_MANAGER: 'Vei putea administra toate aspectele label-ului: artiști, contracte, finanțe și echipă.',
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  AR_MANAGER:    { bg: 'var(--role-ar-light)',      color: 'var(--role-ar-dark)' },
  FINANCIAL:     { bg: 'var(--role-finance-light)',  color: 'var(--role-finance-dark)' },

  LABEL_MANAGER: { bg: 'var(--role-label-light)',    color: 'var(--role-label-dark)' },
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { label: true },
  })

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    redirect('/login?error=Invitatia+nu+este+valida+sau+a+expirat')
  }

  const daysLeft = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const roleStyle = ROLE_COLORS[invitation.role] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role
  const roleDesc = ROLE_DESCRIPTIONS[invitation.role] ?? ''

  async function acceptAction(formData: FormData) {
    'use server'
    await acceptInvitationAction(token, formData)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo / header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-primary)', borderRadius: 14,
            padding: '10px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>♪ SoundLedger</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Ai primit o invitație</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Creează-ți contul pentru a te alătura echipei
          </p>
        </div>

        {/* Invitation card */}
        <div style={{
          background: 'var(--bg-primary)', borderRadius: 16,
          padding: '24px', marginBottom: 16,
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Label info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            paddingBottom: 18, marginBottom: 18,
            borderBottom: '1px solid var(--border-light)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'var(--primary)',
              flexShrink: 0,
            }}>
              {invitation.label.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 2 }}>Invitat de</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{invitation.label.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{invitation.label.city}, {invitation.label.country}</div>
            </div>
          </div>

          {/* Role info */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rolul tău</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontWeight: 600, fontSize: 13,
                background: roleStyle.bg, color: roleStyle.color,
              }}>
                {roleLabel}
              </span>
            </div>
            {roleDesc && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{roleDesc}</p>}
          </div>

          {/* Email + expiry */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px',
            display: 'grid', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Email</span>
              <span style={{ fontWeight: 500 }}>{invitation.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Invitație valabilă</span>
              <span style={{
                fontWeight: 500,
                color: daysLeft <= 1 ? 'var(--status-expired)' : daysLeft <= 3 ? 'var(--role-finance-dark)' : 'var(--text-primary)',
              }}>
                {daysLeft <= 0 ? 'Expiră azi' : `${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Registration form */}
        <div style={{
          background: 'var(--bg-primary)', borderRadius: 16,
          padding: '24px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Creează-ți contul</h2>
          <form action={acceptAction}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">Prenume</label>
                <input id="firstName" name="firstName" className="form-input" required placeholder="Ion" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Nume</label>
                <input id="lastName" name="lastName" className="form-input" required placeholder="Popescu" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Parolă</label>
              <input id="password" name="password" type="password" minLength={6} className="form-input" required placeholder="Minim 6 caractere" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
              Activează contul
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
          Ai deja cont? <a href="/login" style={{ color: 'var(--primary)' }}>Autentifică-te</a>
        </p>
      </div>
    </main>
  )
}
