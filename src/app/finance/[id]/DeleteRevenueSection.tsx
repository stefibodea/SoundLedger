'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteRevenueAction } from '@/app/actions/revenues'

export function DeleteRevenueSection({ revenueId }: { revenueId: string }) {
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
        Șterge înregistrarea
      </button>

      <form ref={formRef} action={deleteRevenueAction} style={{ display: 'none' }}>
        <input type="hidden" name="id" value={revenueId} />
      </form>

      <ConfirmDialog
        isOpen={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title="Șterge înregistrarea"
        message="Ești sigur că vrei să ștergi acest venit? Acțiunea este ireversibilă și va șterge și royalty payment-ul asociat dacă există."
        dangerMode
        confirmLabel="Da, șterge"
        cancelLabel="Anulează"
      />
    </>
  )
}
