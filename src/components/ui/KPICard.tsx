import type { ReactNode } from 'react'

const GROOVES = [
  'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.04) 25%, transparent 50%, rgba(255,255,255,0.04) 75%, transparent)',
  'radial-gradient(circle, transparent 28%, rgba(255,255,255,0.03) 29%, rgba(0,0,0,0.6) 30%, transparent 33%, rgba(255,255,255,0.02) 38%, transparent 43%, rgba(0,0,0,0.4) 53%, transparent 63%)',
].join(', ')

const VINYL: Record<string, { bg: string; border: string; accent: string }> = {
  purple: { bg: 'linear-gradient(135deg, #2e1a47, #1a102f)', border: 'rgba(155,148,240,0.4)',  accent: '#9b94f0' },
  green:  { bg: 'linear-gradient(135deg, #0d2b1e, #1a4a35)', border: 'rgba(110,231,183,0.4)',  accent: '#6ee7b7' },
  yellow: { bg: 'linear-gradient(135deg, #2b2200, #4a3a00)', border: 'rgba(253,230,138,0.4)',  accent: '#fde68a' },
  blue:   { bg: 'linear-gradient(135deg, #0d1f35, #1a3050)', border: 'rgba(147,197,253,0.4)',  accent: '#93c5fd' },
  cyan:   { bg: 'linear-gradient(135deg, #062b2b, #0a4040)', border: 'rgba(34,211,238,0.4)',   accent: '#22d3ee' },
  red:    { bg: 'linear-gradient(135deg, #2b0f0f, #4a1a1a)', border: 'rgba(252,165,165,0.4)',  accent: '#fca5a5' },
  gray:   { bg: 'linear-gradient(135deg, #1c1b22, #2d2b38)', border: 'rgba(255,255,255,0.10)', accent: '#a09e97' },
}

type Props = {
  label: string
  value: ReactNode
  icon?: string
  accentColor?: string
  subtitle?: string
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  bgIcon?: string
  size?: 'sm'
}

export function KPICard({ label, value, accentColor = 'purple', subtitle, trend, size }: Props) {
  const v = VINYL[accentColor] ?? VINYL.purple
  const sm = size === 'sm'

  const trendColor =
    trend?.direction === 'up'   ? '#4ade80' :
    trend?.direction === 'down' ? '#fca5a5' :
    'rgba(200,198,188,0.6)'

  const subLabel = trend
    ? `${trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} ${trend.value}`
    : subtitle ?? null

  const subColor = trend ? trendColor : v.accent

  return (
    <div
      className="vinyl-kpi"
      style={{
        position: 'relative',
        width: sm ? 120 : 140, height: sm ? 120 : 140, borderRadius: '50%',
        background: '#0d0d0f',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
        justifySelf: 'center', alignSelf: 'center',
      }}
    >
      {/* Șanțuri disc */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
        backgroundImage: GROOVES,
      }} />

      {/* Centru colorat */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: sm ? 70 : 80, height: sm ? 70 : 80, borderRadius: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 8,
        background: v.bg, border: `1.5px solid ${v.border}`,
      }}>
        <span style={{
          fontSize: sm ? 18 : 22, fontWeight: 700, color: '#ffffff', lineHeight: 1,
          marginBottom: 2, zIndex: 5, position: 'relative',
        }}>
          {value}
        </span>
        <span style={{
          fontSize: sm ? 10 : 11, textTransform: 'capitalize', letterSpacing: '0.04em',
          color: '#f0efe8', fontWeight: 500,
          zIndex: 5, position: 'relative',
          maxWidth: sm ? 65 : 80, textAlign: 'center', wordBreak: 'break-word',
          lineHeight: 1.3, whiteSpace: 'normal',
        }}>
          {label}
        </span>
        {subLabel && (
          <span style={{
            fontSize: sm ? 9 : 10, color: subColor, marginTop: 2,
            zIndex: 5, position: 'relative',
            lineHeight: 1.2, maxWidth: 70, textAlign: 'center', wordBreak: 'break-word',
            fontWeight: 500, opacity: 0.9,
          }}>
            {subLabel}
          </span>
        )}
      </div>

      {/* Gaura centrală */}
      <div style={{
        position: 'absolute', width: sm ? 10 : 12, height: sm ? 10 : 12, background: '#0d0d0f',
        borderRadius: '50%', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
        zIndex: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }} />
    </div>
  )
}
