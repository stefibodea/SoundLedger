'use client'

import { useRouter } from 'next/navigation'

type Artist = { id: string; name: string }

type Props = {
  artists:  Artist[]
  artistId: string
}

export function PermissionsSelector({ artists, artistId }: Props) {
  const router = useRouter()

  function onArtistChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    if (value) {
      router.push(`/compliance/permissions?artist=${value}`)
    } else {
      router.push('/compliance/permissions')
    }
  }

  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Artist</label>
        <select
          className="form-input form-select"
          value={artistId}
          onChange={onArtistChange}
        >
          <option value="">— Selectează artist —</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

    </section>
  )
}
