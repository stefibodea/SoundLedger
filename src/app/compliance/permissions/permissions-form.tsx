'use client'

import { useState } from 'react'
import { Brain, FlaskConical, FileCheck, UserCheck, ChevronDown, ChevronUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { setAIPermissionAction } from '@/app/actions/compliance'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PermData = {
  allowAITraining:  boolean
  allowResearchOnly: boolean
  requiresLicense:  boolean
  artistConsent:    boolean
  minCompensation:  number | null
  consentDate:      string | null  // 'yyyy-MM-dd'
  notes:            string | null
  updatedAt:        string         // ISO string
}

type Props = {
  trackId:   string
  artistId:  string
  perm:      PermData | null
  canManage: boolean
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({
  name, checked, onChange, color,
}: {
  name: string
  checked: boolean
  onChange: (v: boolean) => void
  color: string
}) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
      />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none',
        background: checked ? color : 'rgba(255,255,255,0.12)',
        transition: 'background 0.25s',
      }}>
        <span style={{
          position: 'absolute',
          width: 18, height: 18, bottom: 3, left: 3,
          borderRadius: '50%', background: 'white',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.25s',
        }} />
      </span>
    </label>
  )
}

// ── Card config ────────────────────────────────────────────────────────────────

type CardConfig = {
  name:        string
  Icon:        LucideIcon
  title:       string
  description: string
  implication: string
  onColor:     string
  offBorder:   string
  onBorder:    string
  onBg:        string
  offBg:       string
}

const CARDS: CardConfig[] = [
  {
    name:        'allowAITraining',
    Icon:        Brain,
    title:       'Antrenare AI permisă',
    description: 'Permite companiilor de inteligență artificială să folosească această piesă pentru antrenarea modelelor lor. Aceasta include platforme precum Suno, Udio sau ElevenLabs.',
    implication: 'Odată acordat, acest drept poate fi dificil de revocat. Recomandăm să activați și "Necesită licență plătită".',
    onColor:     '#9B94F0',
    offBorder:   'rgba(252,165,165,0.2)',
    offBg:       'rgba(252,165,165,0.03)',
    onBorder:    'rgba(155,148,240,0.3)',
    onBg:        'rgba(155,148,240,0.05)',
  },
  {
    name:        'allowResearchOnly',
    Icon:        FlaskConical,
    title:       'Doar research academic',
    description: 'Permite utilizarea exclusiv în scopuri de cercetare academică non-comercială (universități, institute de cercetare). Nu permite utilizare comercială.',
    implication: 'ℹ Opțiune mai sigură decât antrenarea comercială. Recomandată pentru artiști care susțin cercetarea muzicală.',
    onColor:     '#93c5fd',
    offBorder:   'rgba(255,255,255,0.06)',
    offBg:       'transparent',
    onBorder:    'rgba(147,197,253,0.25)',
    onBg:        'rgba(147,197,253,0.05)',
  },
  {
    name:        'requiresLicense',
    Icon:        FileCheck,
    title:       'Necesită licență plătită',
    description: 'Orice utilizare comercială a acestei piese în sisteme AI necesită încheierea unui contract de licențiere și plata unei compensații către label și artist.',
    implication: 'Recomandat puternic dacă antrenarea AI este activată. Protejează drepturile financiare ale artistului.',
    onColor:     '#6ee7b7',
    offBorder:   'rgba(255,255,255,0.06)',
    offBg:       'transparent',
    onBorder:    'rgba(110,231,183,0.25)',
    onBg:        'rgba(110,231,183,0.05)',
  },
  {
    name:        'artistConsent',
    Icon:        UserCheck,
    title:       'Consimțământul artistului confirmat',
    description: 'Bifează dacă ai obținut acordul explicit al artistului pentru utilizarea piesei în sisteme AI. Aceasta este o cerință legală în multe jurisdicții.',
    implication: 'Fără consimțământul artistului, orice permisiune acordată poate fi contestată legal. Verifică contractul artistului.',
    onColor:     '#fde68a',
    offBorder:   'rgba(255,255,255,0.06)',
    offBg:       'transparent',
    onBorder:    'rgba(253,230,138,0.25)',
    onBg:        'rgba(253,230,138,0.05)',
  },
]

// ── View-only mode ─────────────────────────────────────────────────────────────

function ViewMode({ perm }: { perm: PermData | null }) {
  if (!perm) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        Nicio permisiune configurată pentru această piesă.
      </p>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[
        { label: 'Antrenare AI',        value: perm.allowAITraining   ? 'Permis'    : 'Interzis',  ok: perm.allowAITraining },
        { label: 'Research academic',   value: perm.allowResearchOnly ? 'Permis'    : 'Nu',        ok: perm.allowResearchOnly },
        { label: 'Necesită licență',    value: perm.requiresLicense   ? 'Da'        : 'Nu',        ok: !perm.requiresLicense },
        { label: 'Consimțământ artist', value: perm.artistConsent     ? 'Obținut ' : 'Lipsă ✗',  ok: perm.artistConsent },
      ].map((row) => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{row.label}</span>
          <strong style={{ color: row.ok ? 'var(--role-ar-dark)' : 'var(--text-primary)', fontSize: 14 }}>{row.value}</strong>
        </div>
      ))}
      {perm.minCompensation != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Compensație minimă</span>
          <strong style={{ fontSize: 14 }}>{perm.minCompensation} EUR</strong>
        </div>
      )}
      {perm.notes && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          {perm.notes}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PermissionsForm({ trackId, artistId, perm, canManage }: Props) {
  const [allowAITraining,   setAllowAITraining]   = useState(perm?.allowAITraining   ?? false)
  const [allowResearchOnly, setAllowResearchOnly] = useState(perm?.allowResearchOnly ?? false)
  const [requiresLicense,   setRequiresLicense]   = useState(perm?.requiresLicense   ?? true)
  const [artistConsent,     setArtistConsent]     = useState(perm?.artistConsent     ?? false)
  const [infoOpen,          setInfoOpen]          = useState(false)

  if (!canManage) return <ViewMode perm={perm} />

  const states: Record<string, boolean> = { allowAITraining, allowResearchOnly, requiresLicense, artistConsent }
  const setters: Record<string, (v: boolean) => void> = {
    allowAITraining:   setAllowAITraining,
    allowResearchOnly: setAllowResearchOnly,
    requiresLicense:   setRequiresLicense,
    artistConsent:     setArtistConsent,
  }

  return (
    <form action={setAIPermissionAction}>
      <input type="hidden" name="trackId"      value={trackId} />
      <input type="hidden" name="returnArtist" value={artistId} />

      {/* Status banner */}
      {perm ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6ee7b7', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Permisiuni configurate pe{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {new Date(perm.updatedAt).toLocaleDateString('ro-RO')}
            </strong>
          </span>
          <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontSize: 11 }}>
            Configurat
          </span>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(253,230,138,0.06)', border: '1px solid rgba(253,230,138,0.2)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fde68a', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Permisiunile nu au fost configurate încă pentru această piesă.
          </span>
          <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(253,230,138,0.12)', color: '#fde68a', fontSize: 11 }}>
            Neconfigurat
          </span>
        </div>
      )}

      {/* Permission cards */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        {CARDS.map((card) => {
          const checked   = states[card.name]
          const setChecked = setters[card.name]
          return (
            <div
              key={card.name}
              style={{
                padding: '16px 18px', borderRadius: 10,
                border: `1px solid ${checked ? card.onBorder : card.offBorder}`,
                background: checked ? card.onBg : card.offBg,
                transition: 'border-color 0.25s, background 0.25s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'var(--bg-tertiary)', flexShrink: 0, marginTop: 2 }}>
                  <card.Icon size={18} color={checked ? card.onColor : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 8 }}>
                    {card.description}
                  </div>
                  <div style={{ fontSize: 12, color: checked ? card.onColor : 'var(--text-secondary)', opacity: 0.9, fontStyle: 'italic' }}>
                    {card.implication}
                  </div>
                </div>
                <Toggle name={card.name} checked={checked} onChange={setChecked} color={card.onColor} />
              </div>
            </div>
          )
        })}
      </div>

      {/* minCompensation — visible only when requiresLicense is ON */}
      <div style={{
        overflow: 'hidden',
        maxHeight: requiresLicense ? 110 : 0,
        opacity: requiresLicense ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        marginBottom: requiresLicense ? 16 : 0,
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Compensație minimă cerută (€)
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>
              Suma minimă anuală pe care o companie AI trebuie să o plătească
            </span>
          </label>
          <input
            className="form-input"
            type="number"
            name="minCompensation"
            min={0}
            step={100}
            placeholder="ex: 5000"
            disabled={!requiresLicense}
            defaultValue={perm?.minCompensation ?? ''}
          />
        </div>
      </div>

      {/* consentDate — visible only when artistConsent is ON */}
      <div style={{
        overflow: 'hidden',
        maxHeight: artistConsent ? 90 : 0,
        opacity: artistConsent ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        marginBottom: artistConsent ? 16 : 0,
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Data obținerii consimțământului</label>
          <input
            className="form-input"
            type="date"
            name="consentDate"
            disabled={!artistConsent}
            defaultValue={perm?.consentDate ?? ''}
          />
        </div>
      </div>

      {/* Notes — always visible */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">Note suplimentare</label>
        <textarea
          className="form-input form-textarea"
          name="notes"
          rows={3}
          placeholder="ex: Consimțământul a fost obținut prin email pe data de... / Restricții speciale: ..."
          defaultValue={perm?.notes ?? ''}
        />
      </div>

      {/* Save button */}
      <button
        type="submit"
        style={{
          width: '100%', padding: '14px 24px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #9B94F0 0%, #7c74d9 100%)',
          color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          marginBottom: 8,
        }}
      >
        Salvează permisiunile
      </button>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
        Modificările se aplică imediat și sunt înregistrate cu timestamp pentru audit.
      </p>

      {/* Collapsible info section */}
      <div style={{ marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-secondary)', fontSize: 13,
          }}
        >
          {infoOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Ce înseamnă aceste permisiuni?
        </button>

        <div style={{
          overflow: 'hidden',
          maxHeight: infoOpen ? 400 : 0,
          opacity: infoOpen ? 1 : 0,
          transition: 'max-height 0.35s ease, opacity 0.25s ease',
        }}>
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                {['Scenariu', 'Antrenare AI', 'Necesită licență', 'Rezultat'].map((h) => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    color: 'var(--text-secondary)', fontWeight: 600,
                    borderBottom: '1px solid var(--border-light)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ['Protecție totală',      '✗', '—', 'Nicio utilizare AI permisă'],
                ['Licențiere comercială', '', '', 'Utilizare permisă contra cost'],
                ['Research gratuit',      '✗', '✗', 'Doar research academic'],
                ['Orice utilizare',       '', '✗', 'Permis fără compensație (evitați!)'],
              ] as const).map(([scenario, train, license, result]) => (
                <tr key={scenario} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{scenario}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: train === '' ? '#6ee7b7' : 'var(--role-artist-dark)' }}>{train}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: license === '' ? '#6ee7b7' : license === '—' ? 'var(--text-secondary)' : 'var(--role-artist-dark)' }}>{license}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  )
}
