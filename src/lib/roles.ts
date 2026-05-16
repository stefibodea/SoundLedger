export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  LABEL_MANAGER: 'LABEL_MANAGER',
  AR_MANAGER: 'AR_MANAGER',
  FINANCIAL: 'FINANCIAL',
  ARTIST: 'ARTIST',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  LABEL_MANAGER: 'Label Manager',
  AR_MANAGER: 'A&R Manager',
  FINANCIAL: 'Finanțe & Drepturi',
  ARTIST: 'Artist',
}

export function getRoleDisplayName(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function canViewDashboard(_role: string): boolean {
  return true
}

export function canManageArtists(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.AR_MANAGER
}

export function canViewArtists(role: string): boolean {
  return canManageArtists(role)
}

export function canViewCatalog(_role: string): boolean {
  return true
}

export function canManageCatalog(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.AR_MANAGER
}

export function canViewReleases(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.ARTIST
}

export function canManageReleases(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewContracts(role: string): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.LABEL_MANAGER ||
    role === ROLES.FINANCIAL ||
    role === ROLES.ARTIST
  )
}

export function canManageContracts(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.FINANCIAL
}

export function canViewFinance(role: string): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.LABEL_MANAGER ||
    role === ROLES.FINANCIAL ||
    role === ROLES.ARTIST
  )
}

export function canManageFinance(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.FINANCIAL
}

export function canUseScouting(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.AR_MANAGER
}

export function canViewCompliance(role: string): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.LABEL_MANAGER ||
    role === ROLES.AR_MANAGER ||
    role === ROLES.FINANCIAL
  )
}

export function canManageCompliance(role: string): boolean {
  return (
    role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.AR_MANAGER
  )
}

export function canViewFingerprints(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.AR_MANAGER
}

export function canManageTeam(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}
