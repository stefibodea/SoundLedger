'use client'

import { useState } from 'react'

const SOURCE_OPTIONS = [
  'Spotify',
  'YouTube',
  'Instagram',
  'TikTok',
  'SoundCloud',
  'Recomandare',
  'Demo primit prin email',
  'Live / Concert',
  'Altele',
]

export function SourceSelectDetail({ defaultValue }: { defaultValue?: string | null }) {
  const isCustom = defaultValue != null && !SOURCE_OPTIONS.slice(0, -1).includes(defaultValue)
  const [selected, setSelected] = useState(isCustom ? 'Altele' : (defaultValue ?? ''))
  const [custom, setCustom] = useState(isCustom ? (defaultValue ?? '') : '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        name="sourceOption"
        className="form-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">— Neselectat —</option>
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {selected === 'Altele' && (
        <input
          name="sourceCustom"
          className="form-input"
          placeholder="Descrie sursa..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
    </div>
  )
}
