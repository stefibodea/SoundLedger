// Culorile generate determinist din hash-ul numelui — consistente per artist
const PALETTE = ['#9b94f0', '#4ade80', '#facc15', '#60a5fa', '#22d3ee', '#f97316', '#ec4899', '#a78bfa']

function nameToColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type Props = {
  name: string
  imageUrl?: string | null
  size?: number
}

/**
 * Avatar cu poză sau inițiale pe fundal colorat deterministic.
 * Componentă server-side (fără state).
 */
export function Avatar({ name, imageUrl, size = 36 }: Props) {
  const bg = nameToColor(name)

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: '2px solid var(--border-light)',
        }}
      />
    )
  }

  return (
    <div
      aria-label={name}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, color: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials(name)}
    </div>
  )
}
