import { redirect } from 'next/navigation'

export default function LabelSettingsPage() {
  redirect('/settings?tab=label')
}
