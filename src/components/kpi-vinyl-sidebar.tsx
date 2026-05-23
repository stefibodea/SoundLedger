'use client'

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

export type VinylKPI = {
  value: string | number
  label: string
  sublabel?: string
  accentColor?: string
}

type Props = {
  kpis: VinylKPI[]
}

export function KpiVinylSidebar({ kpis }: Props) {
  return (
    <>
    <style>{`
      .vinyl-sidebar-disc {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .vinyl-sidebar-disc:hover {
        transform: scale(1.06) rotate(12deg);
        box-shadow: 0 12px 40px rgba(155,148,240,0.35), 0 0 30px rgba(155,148,240,0.20);
      }
    `}</style>
    <div
      style={{
        position: 'fixed',
        right: 'calc(10vw - 55px)',
        top: '55%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        pointerEvents: 'none',
      }}
    >
      {kpis.map((kpi, i) => {
        const v = VINYL[kpi.accentColor ?? 'purple'] ?? VINYL.purple
        return (
          <div
            key={i}
            className="vinyl-sidebar-disc"
            style={{
              position: 'relative',
              width: 155,
              height: 155,
              borderRadius: '50%',
              background: '#0d0d0f',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              pointerEvents: 'auto',
            }}
          >
            {/* Grooves */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
              backgroundImage: GROOVES,
            }} />

            {/* Colored center */}
            <div style={{
              position: 'relative', zIndex: 2,
              width: 102, height: 102, borderRadius: '50%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: 6,
              background: v.bg, border: `1.5px solid ${v.border}`,
            }}>
              <span style={{
                fontSize: 26, fontWeight: 700, color: '#ffffff', lineHeight: 1,
                marginBottom: 2, zIndex: 5, position: 'relative',
              }}>
                {kpi.value}
              </span>
              <span style={{
                fontSize: 12, textTransform: 'capitalize', letterSpacing: '0.04em',
                color: '#f0efe8', fontWeight: 500,
                zIndex: 5, position: 'relative',
                maxWidth: 90, textAlign: 'center', wordBreak: 'break-word',
                lineHeight: 1.3, whiteSpace: 'normal',
              }}>
                {kpi.label}
              </span>
              {kpi.sublabel && (
                <span style={{
                  fontSize: 10, color: v.accent, marginTop: 2,
                  zIndex: 5, position: 'relative',
                  lineHeight: 1.2, maxWidth: 90, textAlign: 'center', wordBreak: 'break-word',
                  fontWeight: 500, opacity: 0.9,
                }}>
                  {kpi.sublabel}
                </span>
              )}
            </div>

          </div>
        )
      })}
    </div>
    </>
  )
}
