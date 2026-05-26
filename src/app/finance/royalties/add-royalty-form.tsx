'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createRoyaltyPaymentAction } from '@/app/actions/revenues'
import type { ArtistOption } from './royalties-client'

function ArtistAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},45%,32%)`,
      border: `1px solid hsl(${hue},55%,45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: `hsl(${hue},80%,80%)`,
      overflow: 'hidden',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  )
}

function ArtistPicker({ options, value, onChange }: {
  options: ArtistOption[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((a) => a.id === value)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'var(--bg-tertiary)',
          border: open ? '1px solid rgba(155,148,240,0.5)' : '1px solid rgba(255,255,255,0.10)',
          boxShadow: open ? '0 0 0 3px rgba(155,148,240,0.10)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          fontFamily: 'inherit',
        }}
      >
        {selected && <ArtistAvatar name={selected.name} photo={selected.photo} />}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {selected?.name ?? 'Selectează artistul'}
          </div>
          {selected && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              Redevență {selected.royaltyPercent}%
            </div>
          )}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: 'var(--text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(155,148,240,0.15)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {options.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', cursor: 'pointer', border: 'none',
                background: a.id === value ? 'rgba(155,148,240,0.10)' : 'transparent',
                borderLeft: a.id === value ? '2px solid var(--primary)' : '2px solid transparent',
                fontFamily: 'inherit', transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { if (a.id !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (a.id !== value) e.currentTarget.style.background = 'transparent' }}
            >
              <ArtistAvatar name={a.name} photo={a.photo} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: a.id === value ? 600 : 400, color: 'var(--text-primary)' }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                  Redevență {a.royaltyPercent}%
                </div>
              </div>
              {a.id === value && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M2.5 7l3 3 6-6" stroke="#9B94F0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AddRoyaltyForm({ artistOptions }: { artistOptions: ArtistOption[] }) {
  const [open, setOpen] = useState(false)
  const [selectedArtistId, setSelectedArtistId] = useState(artistOptions[0]?.id ?? '')

  const selectedArtist = artistOptions.find((a) => a.id === selectedArtistId)

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen(true)}
        style={{ fontSize: 13, height: 36, padding: '0 16px', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
      >
        + Adaugă plată
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Adaugă plată redevență">
        <form action={createRoyaltyPaymentAction} style={{ display: 'grid', gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Artist *</label>
            <ArtistPicker
              options={artistOptions}
              value={selectedArtistId}
              onChange={setSelectedArtistId}
            />
            <input type="hidden" name="artistId" value={selectedArtistId} />
            <input type="hidden" name="contractId" value={selectedArtist?.contractId ?? ''} />
          </div>

          <div className="form-row" style={{ margin: 0 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="rp-amount">Sumă (€) *</label>
              <input
                id="rp-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                required
                placeholder="ex: 250.00"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="rp-period">Perioadă *</label>
              <input
                id="rp-period"
                name="period"
                className="form-input"
                required
                placeholder="YYYY-MM"
                pattern="\d{4}-\d{2}"
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="rp-notes">Note (opțional)</label>
            <textarea
              id="rp-notes"
              name="notes"
              className="form-input"
              rows={2}
              placeholder="ex: Plată manuală pentru venituri radio Q1 2026"
              style={{ resize: 'none' }}
            />
          </div>

          {selectedArtist && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Contract activ · Procent redevență: <strong style={{ color: 'var(--text-primary)' }}>{selectedArtist.royaltyPercent}%</strong>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Anulează</button>
            <button type="submit" className="btn btn-primary">Înregistrează plata</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
