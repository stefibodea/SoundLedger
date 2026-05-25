'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { upsertCreativeRecordAction, deleteCreativeRecordAction, issueCertFromCreativeAction } from '@/app/actions/compliance-ai'

type Cert = {
  id: string
  certificateCode: string
  issuedAt: string
}

type AIDeclaration = {
  aiCompozitie: boolean
  aiVersuri: boolean
  aiVoce: boolean
  aiProductie: boolean
  aiAltele: string | null
  composers: string | null
  producers: string | null
  daw: string | null
  sessionDate: string | null
  studio: string | null
  instruments: string | null
  statement: string | null
  updatedAt: string
}

type TrackRow = {
  id: string
  title: string
  artistName: string
  type: string
  creativeRecord: AIDeclaration | null
  cert: Cert | null
}

type ComposerOption = {
  id: string
  name: string
}

type Props = {
  tracks: TrackRow[]
  composers: ComposerOption[]
  canManage: boolean
}

const DAW_OPTIONS = [
  'Ableton Live', 'FL Studio', 'Logic Pro', 'Pro Tools', 'Cubase', 'Studio One',
  'GarageBand', 'Reaper', 'Reason', 'Bitwig Studio', 'Nuendo', 'Altul',
]

const AI_STAGES = [
  { key: 'aiCompozitie', label: 'Compoziție melodică', desc: 'Generare melodie, acorduri sau progresii armonice cu AI' },
  { key: 'aiVersuri',    label: 'Versuri / Lyrics',    desc: 'AI a scris sau co-scris textul piesei' },
  { key: 'aiVoce',       label: 'Voce sintetizată',    desc: 'Vocal clone, text-to-speech sau sinteză vocală AI' },
  { key: 'aiProductie',  label: 'Producție / Mixaj / Mastering', desc: 'Beat, aranjament, mixing asistat AI sau mastering automat' },
] as const

type AIStageKey = typeof AI_STAGES[number]['key']

function hasAIUsage(rec: AIDeclaration): boolean {
  return rec.aiCompozitie || rec.aiVersuri || rec.aiVoce || rec.aiProductie || !!rec.aiAltele
}

function aiStageSummary(rec: AIDeclaration): string[] {
  const used: string[] = []
  if (rec.aiCompozitie) used.push('Compoziție')
  if (rec.aiVersuri)    used.push('Versuri')
  if (rec.aiVoce)       used.push('Voce')
  if (rec.aiProductie)  used.push('Producție/Mixaj')
  if (rec.aiAltele)     used.push('Altele')
  return used
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FILTER_OPTIONS = [
  { value: 'all',       label: 'Toate' },
  { value: 'declared',  label: 'Declarate' },
  { value: 'undeclared',label: 'Nedeclarate' },
  { value: 'noai',      label: 'Fără AI' },
  { value: 'certified', label: ' Certificate' },
] as const

type FilterValue = typeof FILTER_OPTIONS[number]['value']

function ComposerPicker({
  options,
  defaultValue,
  name,
}: {
  options: ComposerOption[]
  defaultValue: string
  name: string
}) {
  const initial = defaultValue ? defaultValue.split(',').map((s) => s.trim()).filter(Boolean) : []
  const [selected, setSelected] = useState<string[]>(initial)
  const [custom, setCustom] = useState('')

  function toggle(composerName: string) {
    setSelected((prev) =>
      prev.includes(composerName) ? prev.filter((n) => n !== composerName) : [...prev, composerName],
    )
  }

  function addCustom() {
    const v = custom.trim()
    if (!v) return
    if (!selected.includes(v)) setSelected((prev) => [...prev, v])
    setCustom('')
  }

  function removeChip(name: string) {
    setSelected((prev) => prev.filter((n) => n !== name))
  }

  const value = selected.join(', ')

  return (
    <div>
      <input type="hidden" name={name} value={value} />

      {/* Chips din lista de compozitori angajați */}
      {options.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {options.map((c) => {
            const active = selected.includes(c.name)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.name)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  background: active ? 'rgba(155,148,240,0.18)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(155,148,240,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: active ? '#9B94F0' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {active ? '' : ''}{c.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Chips selecționați care nu sunt în listă (custom sau vechi) */}
      {selected.filter((n) => !options.some((o) => o.name === n)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.filter((n) => !options.some((o) => o.name === n)).map((n) => (
            <span
              key={n}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20, fontSize: 12,
                background: 'rgba(155,148,240,0.12)', border: '1px solid rgba(155,148,240,0.25)',
                color: '#9B94F0',
              }}
            >
              {n}
              <button
                type="button"
                onClick={() => removeChip(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B94F0', padding: 0, lineHeight: 1, fontSize: 14 }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input custom */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="form-input"
          placeholder="Adaugă alt nume..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          style={{ fontSize: 13, flex: 1 }}
        />
        {custom.trim() && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={addCustom} style={{ flexShrink: 0 }}>
            + Adaugă
          </button>
        )}
      </div>
    </div>
  )
}

export function CreativeClient({ tracks, composers, canManage }: Props) {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterValue>('all')
  const [selected, setSelected] = useState<TrackRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // controlled AI checkboxes
  const [aiState, setAiState] = useState<Record<AIStageKey, boolean>>({
    aiCompozitie: false, aiVersuri: false, aiVoce: false, aiProductie: false,
  })
  const [aiAltele, setAiAltele] = useState('')
  const [issueCert, setIssueCert] = useState(true)

  const noAISelected = !Object.values(aiState).some(Boolean) && !aiAltele.trim()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tracks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.artistName.toLowerCase().includes(q)) return false
      if (filter === 'declared'   && !t.creativeRecord) return false
      if (filter === 'undeclared' &&  t.creativeRecord) return false
      if (filter === 'noai'       && (!t.creativeRecord || hasAIUsage(t.creativeRecord))) return false
      if (filter === 'certified'  && !t.cert) return false
      return true
    })
  }, [tracks, search, filter])

  function openModal(track: TrackRow) {
    const rec = track.creativeRecord
    setSelected(track)
    setAiState({
      aiCompozitie: rec?.aiCompozitie ?? false,
      aiVersuri:    rec?.aiVersuri    ?? false,
      aiVoce:       rec?.aiVoce       ?? false,
      aiProductie:  rec?.aiProductie  ?? false,
    })
    setAiAltele(rec?.aiAltele ?? '')
    setIssueCert(!track.cert)
    setModalOpen(true)
  }

  function toggleAI(key: AIStageKey) {
    setAiState((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const aiStatus = (t: TrackRow) => {
    if (!t.creativeRecord) return { label: 'Nedeclarat', color: 'var(--text-tertiary)' }
    const stages = aiStageSummary(t.creativeRecord)
    if (stages.length === 0) return { label: 'Fără AI', color: '#4ade80' }
    return { label: stages.join(', '), color: 'var(--role-finance-dark)' }
  }

  return (
    <>
      {/* Filtre */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <input
            className="form-input"
            placeholder="Caută piesă sau artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 14 }}></span>
        </div>
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              background: filter === value ? 'rgba(155,148,240,0.15)' : 'rgba(255,255,255,0.04)',
              border: filter === value ? '1px solid rgba(155,148,240,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: filter === value ? '#9B94F0' : 'var(--text-secondary)',
              fontWeight: filter === value ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {filtered.length} piese
        </span>
      </div>

      {/* Tabel */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Piesă</th>
                <th>Artist</th>
                <th>Implicare AI</th>
                <th>Certificat HM</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px 0' }}>
                  Nicio piesă găsită.
                </td></tr>
              ) : filtered.map((t) => {
                const st = aiStatus(t)
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.artistName}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 500, color: st.color }}>{st.label}</span>
                    </td>
                    <td>
                      {t.cert ? (
                        <div>
                          <Link
                            href={`/compliance/certificates/${t.cert.id}`}
                            style={{ fontSize: 12, fontWeight: 500, color: 'var(--role-ar-dark)', textDecoration: 'none' }}
                          >
                             {t.cert.certificateCode}
                          </Link>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{fmtDate(t.cert.issuedAt)}</div>
                        </div>
                      ) : t.creativeRecord && !hasAIUsage(t.creativeRecord) && canManage ? (
                        <form action={issueCertFromCreativeAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="trackId" value={t.id} />
                          <button type="submit" className="btn btn-sm btn-ghost" style={{ fontSize: 11, color: 'var(--role-ar-dark)' }}>
                            + Emite cert.
                          </button>
                        </form>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 11 }}
                          onClick={() => openModal(t)}
                        >
                          {t.creativeRecord ? 'Editează' : '+ Declară'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {selected && (
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelected(null) }}
          title={`Declarație AI — ${selected.title}`}
          size="lg"
        >
          <form action={upsertCreativeRecordAction}>
            <input type="hidden" name="trackId" value={selected.id} />
            <input type="hidden" name="issueCert" value={issueCert && noAISelected ? 'true' : 'false'} />
            {/* hidden inputs pentru starea checkbox-urilor controlate */}
            <input type="hidden" name="aiCompozitie" value={aiState.aiCompozitie ? 'true' : 'false'} />
            <input type="hidden" name="aiVersuri"    value={aiState.aiVersuri    ? 'true' : 'false'} />
            <input type="hidden" name="aiVoce"       value={aiState.aiVoce       ? 'true' : 'false'} />
            <input type="hidden" name="aiProductie"  value={aiState.aiProductie  ? 'true' : 'false'} />
            <input type="hidden" name="aiAltele"     value={aiAltele} />

            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Artist: <strong style={{ color: 'var(--text-primary)' }}>{selected.artistName}</strong>
            </p>

            {/* Secțiunea AI */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                Unde a fost folosit AI în realizarea acestei piese?
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {AI_STAGES.map(({ key, label, desc }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: aiState[key] ? 'rgba(253,230,138,0.08)' : 'rgba(255,255,255,0.03)',
                      border: aiState[key] ? '1px solid rgba(253,230,138,0.25)' : '1px solid rgba(255,255,255,0.07)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={aiState[key]}
                      onChange={() => toggleAI(key)}
                      style={{ accentColor: 'var(--role-finance-dark)', marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: aiState[key] ? 'var(--role-finance-dark)' : 'var(--text-primary)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
                    </div>
                  </label>
                ))}

                {/* Altele — text liber */}
                <div style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: aiAltele.trim() ? 'rgba(253,230,138,0.08)' : 'rgba(255,255,255,0.03)',
                  border: aiAltele.trim() ? '1px solid rgba(253,230,138,0.25)' : '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Alte aspecte cu AI
                  </div>
                  <input
                    className="form-input"
                    placeholder="ex: generare artwork, idei de titlu, traducere versuri..."
                    value={aiAltele}
                    onChange={(e) => setAiAltele(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Status rezumat */}
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 6,
                background: noAISelected ? 'rgba(110,231,183,0.08)' : 'rgba(253,230,138,0.08)',
                border: noAISelected ? '1px solid rgba(110,231,183,0.2)' : '1px solid rgba(253,230,138,0.2)',
                fontSize: 12,
                color: noAISelected ? '#4ade80' : 'var(--role-finance-dark)',
              }}>
                {noAISelected
                  ? 'Nicio etapă cu AI selectată — piesa este eligibilă pentru Certificat Human Made'
                  : `AI utilizat în: ${[
                      aiState.aiCompozitie && 'Compoziție',
                      aiState.aiVersuri    && 'Versuri',
                      aiState.aiVoce       && 'Voce',
                      aiState.aiProductie  && 'Producție/Mixaj',
                      aiAltele.trim()      && 'Altele',
                    ].filter(Boolean).join(', ')}`
                }
              </div>
            </div>

            {/* Secțiunea creatori umani — colapsată vizual */}
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}>
                ▸ Informații creatori umani (opțional)
              </summary>
              <div style={{ paddingTop: 8 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Compozitori</label>
                    <ComposerPicker
                      name="composers"
                      options={composers}
                      defaultValue={selected.creativeRecord?.composers ?? ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Producători</label>
                    <input name="producers" className="form-input" defaultValue={selected.creativeRecord?.producers ?? ''} placeholder="ex: DJ Exemplu" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">DAW folosit</label>
                    <select name="daw" className="form-input form-select" defaultValue={selected.creativeRecord?.daw ?? ''}>
                      <option value="">Selectează...</option>
                      {DAW_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data sesiunii</label>
                    <input name="sessionDate" className="form-input" type="date" defaultValue={selected.creativeRecord?.sessionDate ?? ''} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Studio / Locație</label>
                    <input name="studio" className="form-input" defaultValue={selected.creativeRecord?.studio ?? ''} placeholder="ex: Studio Acasă, București" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instrumente folosite</label>
                    <input name="instruments" className="form-input" defaultValue={selected.creativeRecord?.instruments ?? ''} placeholder="ex: Chitară, tobe live, bass" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Declarație privind autoratul</label>
                  <textarea
                    name="statement"
                    className="form-input"
                    rows={2}
                    defaultValue={selected.creativeRecord?.statement ?? ''}
                    placeholder="ex: Declar că această piesă a fost compusă integral de autori umani..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
            </details>

            {/* Auto-cert */}
            {noAISelected && !selected.cert && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', marginBottom: 12,
                background: 'rgba(110,231,183,0.06)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: 8,
              }}>
                <input
                  type="checkbox"
                  id="issueCertCheck"
                  checked={issueCert}
                  onChange={(e) => setIssueCert(e.target.checked)}
                  style={{ accentColor: '#4ade80', marginTop: 2, cursor: 'pointer' }}
                />
                <label htmlFor="issueCertCheck" style={{ fontSize: 13, cursor: 'pointer', lineHeight: 1.5 }}>
                  <strong style={{ color: '#4ade80' }}> Emite automat Certificat Human Made</strong>
                  <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                    Certificatul atestă oficial că piesa este 100% creație umană și poate fi folosit în litigii.
                  </span>
                </label>
              </div>
            )}
            {selected.cert && (
              <div style={{ fontSize: 12, color: 'var(--role-ar-dark)', padding: '8px 12px', background: 'rgba(110,231,183,0.06)', borderRadius: 8, marginBottom: 12 }}>
                 Certificat activ: <strong>{selected.cert.certificateCode}</strong> · {fmtDate(selected.cert.issuedAt)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {noAISelected && issueCert && !selected.cert ? 'Salvează + Emite certificat' : 'Salvează declarație'}
              </button>
              {selected.creativeRecord && (
                <form action={deleteCreativeRecordAction} style={{ display: 'contents' }}>
                  <input type="hidden" name="trackId" value={selected.id} />
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    style={{ color: 'var(--role-artist-dark)', fontSize: 13 }}
                    onClick={(e) => { if (!confirm('Ștergi declarația AI pentru această piesă?')) e.preventDefault() }}
                  >
                    Șterge
                  </button>
                </form>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
