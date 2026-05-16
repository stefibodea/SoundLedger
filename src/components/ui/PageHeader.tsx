import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  /** Buton de acțiune principală (ex: "+ Adaugă artist") — opțional */
  action?: ReactNode
}

/** Header standardizat pentru paginile de liste */
export function PageHeader({ title, description, action }: Props) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {description && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
