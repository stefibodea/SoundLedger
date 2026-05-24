'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { suspendLabelAction } from '@/app/actions/admin'

export function SuspendLabelSection({ labelId, labelName }: { labelId: string; labelName: string }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        style={{ width: '100%', color: '#fde68a', borderColor: '#fde68a', fontSize: 13 }}
      >
        ⏸ Suspendează
      </button>

      <form ref={formRef} action={suspendLabelAction} style={{ display: 'none' }}>
        <input type="hidden" name="labelId" value={labelId} />
      </form>

      <ConfirmDialog
        isOpen={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={`Suspendă "${labelName}"`}
        message={`Ești sigură că vrei să suspendezi această casă de discuri? Toți membrii echipei vor pierde accesul la aplicație până la reactivare.`}
        dangerMode
        confirmLabel="Da, suspendează"
        cancelLabel="Anulează"
      />
    </>
  )
}
