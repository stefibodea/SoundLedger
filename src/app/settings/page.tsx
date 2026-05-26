import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guards'
import { enforceOnboarding } from '@/lib/onboarding'
import { getRoleDisplayName, canManageTeam, canManageOptOut } from '@/lib/roles'
import { SettingsClient } from './settings-client'
import type { UserData, LabelData, OptOutData } from './settings-client'

const ROLE_GRADIENTS: Record<string, string> = {
  SUPER_ADMIN:   'linear-gradient(135deg, #fca5a5, #e85d5d)',
  LABEL_MANAGER: 'linear-gradient(135deg, #9B94F0, #6366f1)',
  FINANCIAL:     'linear-gradient(135deg, #fde68a, #f59e0b)',
}
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN:   { bg: 'rgba(252,165,165,0.12)', text: '#fca5a5', border: 'rgba(252,165,165,0.3)' },
  LABEL_MANAGER: { bg: 'rgba(155,148,240,0.12)', text: '#9B94F0', border: 'rgba(155,148,240,0.3)' },
  FINANCIAL:     { bg: 'rgba(218,165,32,0.15)',  text: '#f0c040', border: 'rgba(218,165,32,0.35)' },
}

type PageProps = {
  searchParams: Promise<{ tab?: string; success?: string; error?: string; revoked?: string; invite?: string; mail?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await requireSession()
  await enforceOnboarding(session, '/settings')

  const sp = await searchParams
  const tab      = sp.tab     ?? 'profil'
  const success  = sp.success ?? undefined
  const error    = sp.error   ?? undefined
  const revoked  = sp.revoked ?? undefined
  const inviteToken = sp.invite ?? undefined
  const mailStatus  = sp.mail   ?? undefined

  const showLabel  = canManageTeam(session.role)
  const showOptOut = canManageOptOut(session.role)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'

  const [rawUser, rawLabel, optOutDecl, tracksCount, members, invitations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        firstName: true, lastName: true, email: true, role: true,
        avatar: true, createdAt: true,
        label: { select: { name: true } },
      },
    }),
    showLabel && session.labelId
      ? prisma.label.findUnique({
          where: { id: session.labelId },
          select: { name: true, country: true, city: true, genre: true, logo: true, plan: true, planExpiry: true },
        })
      : null,
    showOptOut && session.labelId
      ? prisma.aIOptOutDeclaration.findUnique({ where: { labelId: session.labelId } })
      : null,
    session.labelId
      ? prisma.track.count({ where: { labelId: session.labelId } })
      : 0,
    showLabel && session.labelId
      ? prisma.user.findMany({
          where: { labelId: session.labelId },
          select: { id: true, firstName: true, lastName: true, email: true, role: true, avatar: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : [],
    showLabel && session.labelId
      ? prisma.invitation.findMany({
          where: { labelId: session.labelId, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : [],
  ])

  if (!rawUser) redirect('/login')

  const initials = `${rawUser.firstName[0] ?? ''}${rawUser.lastName[0] ?? ''}`.toUpperCase()

  const user: UserData = {
    firstName:   rawUser.firstName,
    lastName:    rawUser.lastName,
    email:       rawUser.email,
    role:        rawUser.role,
    avatar:      rawUser.avatar,
    createdAt:   rawUser.createdAt.toISOString(),
    labelName:   rawUser.label?.name ?? null,
    initials,
    gradient:    ROLE_GRADIENTS[rawUser.role] ?? ROLE_GRADIENTS.LABEL_MANAGER,
    roleColors:  ROLE_COLORS[rawUser.role]    ?? ROLE_COLORS.LABEL_MANAGER,
    roleDisplay: getRoleDisplayName(rawUser.role),
  }

  const label: LabelData = rawLabel
    ? {
        name:       rawLabel.name,
        country:    rawLabel.country,
        city:       rawLabel.city,
        genre:      rawLabel.genre,
        logo:       rawLabel.logo,
        plan:       rawLabel.plan,
        planExpiry: rawLabel.planExpiry ? new Date(rawLabel.planExpiry).toISOString() : null,
      }
    : null

  const optOut: OptOutData = optOutDecl
    ? {
        declarationCode: optOutDecl.declarationCode,
        issuedAt:        optOutDecl.issuedAt.toISOString(),
        legalBasis:      optOutDecl.legalBasis,
        notes:           optOutDecl.notes,
        isRevoked:       optOutDecl.isRevoked,
        revokedAt:       optOutDecl.revokedAt ? optOutDecl.revokedAt.toISOString() : null,
        revokedReason:   optOutDecl.revokedReason,
      }
    : null

  const memberRows = (members as { id: string; firstName: string; lastName: string; email: string; role: string; avatar: string | null; createdAt: Date }[]).map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
  }))

  const invitationRows = (invitations as { id: string; email: string; role: string; token: string; expiresAt: Date }[]).map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    expiresAt: inv.expiresAt.toISOString(),
  }))

  return (
    <AppShell session={session} title="Profilul meu">
      <SettingsClient
        initialTab={tab}
        success={success}
        error={error}
        revoked={revoked}
        inviteToken={inviteToken}
        inviteMailStatus={mailStatus}
        appUrl={appUrl}
        user={user}
        label={label}
        optOut={optOut}
        tracksCount={tracksCount}
        canManageLabel={showLabel}
        canOptOut={showOptOut}
        members={memberRows}
        invitations={invitationRows}
        currentUserId={session.userId}
      />
    </AppShell>
  )
}
