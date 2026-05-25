export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  LABEL_MANAGER: 'LABEL_MANAGER',
  FINANCIAL: 'FINANCIAL',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  LABEL_MANAGER: 'Label Manager',
  FINANCIAL: 'Finanțe & Drepturi',
}

export function getRoleDisplayName(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function canViewDashboard(_role: string): boolean {
  return true
}

export function canManageArtists(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewArtists(role: string): boolean {
  return true
}

export function canViewCatalog(_role: string): boolean {
  return true
}

export function canManageCatalog(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewReleases(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canManageReleases(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewContracts(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.FINANCIAL
}

export function canManageContracts(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewFinance(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER || role === ROLES.FINANCIAL
}

export function canManageFinance(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.FINANCIAL
}

export function canUseScouting(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewCompliance(role: string): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.LABEL_MANAGER ||
    role === ROLES.FINANCIAL
  )
}

export function canManageCompliance(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

// Declarație Opt-Out AI — decizie juridică la nivelul labelului
export function canManageOptOut(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

// Acțiuni legale pe detecții: confirmare status, takedown, compensație
export function canActOnDetection(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canViewFingerprints(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}

export function canManageTeam(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.LABEL_MANAGER
}
