import type { ReactNode } from 'react'

type Props = {
  /** Emoji sau icon mare afișat sus */
  icon?: string
  title: string
  description?: string
  /** Buton / link CTA opțional */
  action?: ReactNode
}

/**
 * Stare goală standardizată — afișată când nu există date de listat.
 * Componentă server-side (fără state).
 */
export function EmptyState({ icon = '', title, description, action }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '56px 24px',
      textAlign: 'center',
      color: 'var(--text-secondary)',
    }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>}
      <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 13, margin: '0 0 20px', maxWidth: 380, lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
