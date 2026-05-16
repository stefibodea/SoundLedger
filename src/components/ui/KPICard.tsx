import type { ReactNode } from 'react'

const ACCENT_COLORS: Record<string, string> = {
  purple: '#9b94f0',
  green:  '#4ade80',
  yellow: '#facc15',
  blue:   '#60a5fa',
  cyan:   '#22d3ee',
  red:    'var(--role-artist-dark)',
  gray:   'var(--text-secondary)',
}

type Props = {
  label: string
  value: ReactNode
  icon?: string
  accentColor?: string
  subtitle?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  /** Iconiță mare afișată ca watermark în fundalul cardului (10% opacitate) */
  bgIcon?: string
}

export function KPICard({ label, value, icon, accentColor = 'purple', subtitle, trend, bgIcon }: Props) {
  const color = ACCENT_COLORS[accentColor] ?? accentColor

  const trendColor =
    trend?.direction === 'up'   ? '#4ade80' :
    trend?.direction === 'down' ? 'var(--role-artist-dark)' :
    'var(--text-secondary)'

  return (
    <div
      className="card card-stat"
      style={{
        borderTop: `3px solid ${color}`,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.12) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: `0 0 32px ${color}18, 0 2px 10px rgba(0,0,0,0.25)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Watermark icon */}
      {bgIcon && (
        <span style={{
          position: 'absolute', right: 10, bottom: 6,
          fontSize: 52, opacity: 0.07, pointerEvents: 'none', userSelect: 'none',
          lineHeight: 1,
        }}>
          {bgIcon}
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="stat-value"
            style={{
              fontSize: 32,
              lineHeight: 1.1,
              background: 'linear-gradient(180deg, #f0efe8 0%, #9a9890 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {value}
          </div>
          <div className="stat-label" style={{ marginTop: 4 }}>{label}</div>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div style={{ fontSize: 11, color: trendColor, marginTop: 4, fontWeight: 500 }}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <span style={{ fontSize: 22, opacity: 0.55, flexShrink: 0, marginLeft: 8 }}>
            {icon}
          </span>
        )}
      </div>
    </div>
  )
}
