'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Artist = { id: string; name: string }

type Props = {
  artists: Artist[]
}

export function CatalogFilters({ artists }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <select
        className="form-input form-select"
        style={{ width: 'auto', minWidth: 160 }}
        value={searchParams.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
      >
        <option value="">Toate statusurile</option>
        <option value="UNRELEASED">Nelansat</option>
        <option value="RELEASED">Lansat</option>
      </select>

      <select
        className="form-input form-select"
        style={{ width: 'auto', minWidth: 160 }}
        value={searchParams.get('type') ?? ''}
        onChange={(e) => update('type', e.target.value)}
      >
        <option value="">Toate tipurile</option>
        <option value="SINGLE">Single</option>
        <option value="ALBUM_TRACK">Track album</option>
        <option value="EP_TRACK">Track EP</option>
      </select>

      <select
        className="form-input form-select"
        style={{ width: 'auto', minWidth: 180 }}
        value={searchParams.get('artistId') ?? ''}
        onChange={(e) => update('artistId', e.target.value)}
      >
        <option value="">Toți artiștii</option>
        {artists.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {(searchParams.get('status') || searchParams.get('type') || searchParams.get('artistId')) && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push(pathname)}
        >
          Șterge filtrele ✕
        </button>
      )}
    </div>
  )
}
