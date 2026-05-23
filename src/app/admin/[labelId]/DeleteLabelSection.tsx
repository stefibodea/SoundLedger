'use client'

import { useState, useRef } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteLabelAction } from '@/app/actions/admin'

export function DeleteLabelSection({ labelId, labelName }: { labelId: string; labelName: string }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
        style={{ width: '100%', color: 'var(--role-artist-dark)', borderColor: 'var(--role-artist-dark)', fontSize: 13 }}
      >
        🗑 Șterge definitiv
      </button>

      <form ref={formRef} action={deleteLabelAction} style={{ display: 'none' }}>
        <input type="hidden" name="labelId" value={labelId} />
      </form>

      <ConfirmDialog
        isOpen={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={`Șterge "${labelName}"`}
        message={`Ești absolut sigur? Această acțiune va șterge complet casa de discuri "${labelName}" împreună cu toți artiștii, piesele, contractele, veniturile și toți membrii echipei. Acțiunea este ireversibilă.`}
        dangerMode
        confirmLabel="Da, șterge tot"
        cancelLabel="Anulează"
      />
    </>
  )
}
