import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { LabelManagerDashboard } from './label-manager-dashboard'
import { ARManagerDashboard } from './ar-manager-dashboard'
import { FinanceManagerDashboard } from './finance-manager-dashboard'

export default async function DashboardPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/dashboard')

  if (session.role === ROLES.SUPER_ADMIN || session.role === ROLES.LABEL_MANAGER) {
    return <LabelManagerDashboard session={session} />
  }

  if (session.role === ROLES.AR_MANAGER) {
    return <ARManagerDashboard session={session} />
  }

  if (session.role === ROLES.FINANCIAL) {
    return <FinanceManagerDashboard session={session} />
  }

  // Fallback — should not happen with current roles
  return <LabelManagerDashboard session={session} />
}
