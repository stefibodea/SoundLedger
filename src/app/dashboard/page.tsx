import { requireSession } from '@/lib/auth-guards'
import { ROLES } from '@/lib/roles'
import { enforceOnboarding } from '@/lib/onboarding'
import { LabelManagerDashboard } from './label-manager-dashboard'
import { FinanceManagerDashboard } from './finance-manager-dashboard'

export default async function DashboardPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/dashboard')

  if (session.role === ROLES.FINANCIAL) {
    return <FinanceManagerDashboard session={session} />
  }

  return <LabelManagerDashboard session={session} />
}
