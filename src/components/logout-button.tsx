'use client'

import { useTransition } from 'react'
import { logoutAction } from '@/app/actions/auth'

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      className="btn btn-secondary"
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
    >
      {isPending ? '…' : 'Deconectare'}
    </button>
  )
}
