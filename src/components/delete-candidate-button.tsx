'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteProspectAction } from '@/app/actions/ar'

export function DeleteCandidateButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        style={{ color: 'var(--status-expired)', borderColor: 'var(--status-expired)' }}
      >
        Șterge candidat
      </button>

      <form ref={formRef} action={deleteProspectAction} style={{ display: 'none' }}>
        <input type="hidden" name="id" value={id} />
      </form>

      <ConfirmDialog
        isOpen={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title="Șterge candidat"
        message="Ești sigură că vrei să ștergi acest candidat? Acțiunea este permanentă și nu poate fi anulată."
        dangerMode
        confirmLabel="Da, șterge"
        cancelLabel="Anulează"
      />
    </>
  )
}
