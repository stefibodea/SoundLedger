'use client'

import { deleteProspectAction } from '@/app/actions/ar'

export function DeleteProspectButton({ id }: { id: string }) {
  return (
    <form action={deleteProspectAction} onSubmit={(e) => {
      if (!confirm('Ești sigur că vrei să ștergi acest prospect? Acțiunea este ireversibilă.')) {
        e.preventDefault()
      }
    }}>
      <input type="hidden" name="id" value={id} />
      <button
        className="btn btn-secondary"
        type="submit"
        style={{ color: 'var(--status-expired)', borderColor: 'var(--status-expired)' }}
      >
        Șterge prospect
      </button>
    </form>
  )
}
