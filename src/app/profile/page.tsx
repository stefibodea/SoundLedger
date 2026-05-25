import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { getRoleDisplayName } from '@/lib/roles'
import { ProfileForm } from './profile-form'
import { changePasswordAction } from '@/app/actions/profile'
import { PasswordInput } from '@/components/ui/PasswordInput'

const ROLE_GRADIENTS: Record<string, string> = {
  SUPER_ADMIN:   'linear-gradient(135deg, #fca5a5, #e85d5d)',
  LABEL_MANAGER: 'linear-gradient(135deg, #9B94F0, #6366f1)',
  AR_MANAGER:    'linear-gradient(135deg, #6ee7b7, #10b981)',
  FINANCIAL:     'linear-gradient(135deg, #fde68a, #f59e0b)',
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.12)', text: '#fca5a5', border: 'rgba(252,165,165,0.3)' },
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.12)', text: '#9B94F0',  border: 'rgba(155,148,240,0.3)' },
  AR_MANAGER:    { bg: 'rgba(110,231,183,0.12)', text: '#6ee7b7',  border: 'rgba(110,231,183,0.3)' },
  FINANCIAL:     { bg: 'rgba(253,230,138,0.12)', text: '#fde68a',  border: 'rgba(253,230,138,0.3)' },
}

const SUCCESS_MESSAGES: Record<string, string> = {
  profil_actualizat: 'Profilul a fost actualizat cu succes.',
  parola_actualizata: 'Parola a fost schimbată cu succes.',
}

const ERROR_MESSAGES: Record<string, string> = {
  campuri_obligatorii: 'Prenumele și numele sunt obligatorii.',
  email_invalid: 'Adresa de email nu este validă.',
  parola_incorecta: 'Parola actuală este incorectă.',
  parolele_nu_coincid: 'Parolele noi nu coincid.',
  parola_prea_scurta: 'Parola nouă trebuie să aibă cel puțin 8 caractere.',
  parola_fara_litera_mare: 'Parola nouă trebuie să conțină cel puțin o literă mare.',
  parola_fara_cifra: 'Parola nouă trebuie să conțină cel puțin o cifră.',
  parola_fara_special: 'Parola nouă trebuie să conțină cel puțin un caracter special.',
  utilizator_negasit: 'Utilizatorul nu a fost găsit.',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await requireSession()
  const params = await searchParams

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      label: {
        select: { name: true, country: true, city: true, genre: true },
      },
    },
  })

  if (!user) redirect('/login')

  const gradient = ROLE_GRADIENTS[user.role] ?? ROLE_GRADIENTS.LABEL_MANAGER
  const colors = ROLE_COLORS[user.role] ?? ROLE_COLORS.LABEL_MANAGER
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
  const avatarUrl = user.avatar ? `/uploads/avatars/${user.avatar}` : null

  const successMsg = params.success ? SUCCESS_MESSAGES[params.success] : null
  const errorMsg = params.error
    ? (ERROR_MESSAGES[params.error] ?? 'A apărut o eroare.')
    : null

  return (
    <AppShell session={session} title="Profilul meu">
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(110,231,183,0.12)',
            border: '1px solid rgba(110,231,183,0.3)',
            color: '#6ee7b7',
            fontSize: 14,
          }}>
            ✓ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(252,165,165,0.12)',
            border: '1px solid rgba(252,165,165,0.3)',
            color: '#fca5a5',
            fontSize: 14,
          }}>
            ✗ {errorMsg}
          </div>
        )}

        {/* Card: Informații personale */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
            Informații personale
          </h2>

          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={initials}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Info grid */}
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 24px',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Prenume
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {user.firstName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nume
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {user.lastName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Email
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {user.email}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Rol
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 999,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.text,
                  }}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Membru din
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {formatDate(user.createdAt)}
                  </div>
                </div>
                {user.label && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Label
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {user.label.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ProfileForm
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              avatar: user.avatar,
            }}
          />
        </div>

        {/* Card: Schimbă parola */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
            Schimbă parola
          </h2>
          <form
            action={changePasswordAction}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}
          >
            <div className="form-group">
              <label className="form-label">Parola actuală</label>
              <PasswordInput id="currentPassword" name="currentPassword" required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Parola nouă</label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                className="form-input"
                minLength={8}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                Minim 8 caractere, o literă mare, o cifră și un caracter special.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmă parola nouă</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                className="form-input"
                minLength={8}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                Actualizează parola
              </button>
            </div>
          </form>
        </div>

      </div>
    </AppShell>
  )
}
