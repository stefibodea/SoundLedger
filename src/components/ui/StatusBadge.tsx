// Variantele disponibile și culorile lor
const VARIANT_STYLES: Record<string, { bg: string; color: string }> = {
  success: { bg: 'var(--role-ar-light,  rgba(74,222,128,0.12))', color: 'var(--role-ar-dark,  #4ade80)' },
  warning: { bg: 'var(--role-finance-light, rgba(250,204,21,0.12))', color: 'var(--role-finance-dark, #facc15)' },
  danger:  { bg: 'var(--role-artist-light, rgba(239,68,68,0.12))', color: 'var(--role-artist-dark, #ef4444)' },
  info:    { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  neutral: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
  purple:  { bg: 'rgba(155,148,240,0.12)', color: '#9b94f0' },
  cyan:    { bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
}

type Variant = keyof typeof VARIANT_STYLES

type Props = {
  /** Textul afișat în badge */
  label: string
  variant?: Variant
  /** Emoji sau caracter de prefix */
  icon?: string
}

/**
 * Badge de status colorat, semantic.
 * Componentă server-side (fără state, fără event handlers).
 */
export function StatusBadge({ label, variant = 'neutral', icon }: Props) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral

  return (
    <span
      className="badge"
      style={{
        background: styles.bg,
        color: styles.color,
        fontWeight: 500,
      }}
    >
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
      {label}
    </span>
  )
}

// ── Helper — mapare status din DB la variant ───────────────────────────────────

/** Mapare standard pentru status contracte */
export function contractStatusVariant(status: string): Variant {
  switch (status) {
    case 'ACTIVE':      return 'success'
    case 'EXPIRING':    return 'warning'
    case 'EXPIRED':     return 'danger'
    case 'DRAFT':       return 'neutral'
    case 'NEGOTIATION': return 'info'
    default:            return 'neutral'
  }
}

/** Mapare standard pentru status piese/lansări */
export function trackStatusVariant(status: string): Variant {
  switch (status) {
    case 'RELEASED':  return 'success'
    case 'READY':     return 'info'
    case 'PLANNING':  return 'neutral'
    default:          return 'neutral'
  }
}

/** Mapare standard pentru status detecții AI */
export function detectionStatusVariant(status: string): Variant {
  switch (status) {
    case 'PENDING':   return 'warning'
    case 'CONFIRMED': return 'danger'
    case 'RESOLVED':  return 'success'
    case 'DISMISSED': return 'neutral'
    default:          return 'neutral'
  }
}

/** Mapare standard pentru status prospecte A&R */
export function prospectStatusVariant(status: string): Variant {
  switch (status) {
    case 'IDENTIFIED': return 'neutral'
    case 'ANALYZING':  return 'info'
    case 'CONTACTED':  return 'purple'
    case 'NEGOTIATION':return 'warning'
    case 'SIGNED':     return 'success'
    case 'REJECTED':   return 'danger'
    default:           return 'neutral'
  }
}
