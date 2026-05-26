import { redirect } from 'next/navigation'

export default function OptOutSettingsPage() {
  redirect('/settings?tab=optout')
}
