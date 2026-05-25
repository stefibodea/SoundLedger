'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

export type MonthlyBySource = Record<string, string | number>
export type SourceRevenue   = { source: string; total: number }

const SOURCE_LABELS: Record<string, string> = {
  SPOTIFY:             'Spotify',
  APPLE_MUSIC:         'Apple Music',
  YOUTUBE_MUSIC:       'YouTube Music',
  YOUTUBE_CONTENT_ID:  'YT Content ID',
  TIKTOK:              'TikTok',
  DEEZER:              'Deezer',
  RADIO_TV:            'Radio & TV',
  SYNC_LICENSING:      'Sync Licensing',
  LICENTIERE:          'Licențiere',
  VANZARI_FIZICE:      'Vânzări fizice',
  MERCHANDISE:         'Merchandise',
  ALTE_SURSE:          'Alte surse',
  // legacy
  STREAMING:           'Spotify',
  YOUTUBE:             'YouTube',
  LICENSING:           'Licențiere',
  PHYSICAL:            'Vânzări fizice',
  SYNC:                'Sync',
}

const COLORS = ['#22c55e', '#ef4444', '#ec4899', '#6366f1', '#94a3b8', '#f59e0b', '#06b6d4', '#8b5cf6', '#f97316', '#84cc16', '#14b8a6', '#a78bfa']

export function RevenueCharts({
  monthlyBySource,
  activeSources,
  bySource,
}: {
  monthlyBySource: MonthlyBySource[]
  activeSources: string[]
  bySource: SourceRevenue[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

      {/* Stacked bar — venituri per lună pe sursă */}
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>Venituri {new Date().getFullYear()} pe sursă</h4>
        {monthlyBySource.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nu există date.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyBySource} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const [year, month] = v.split('-')
                  const MONTHS = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']
                  return `${MONTHS[parseInt(month) - 1] ?? month} '${year.slice(2)}`
                }}
              />
              <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `${v} €`} />
              <Tooltip
                formatter={(v: number, name: string) => [`${v.toFixed(2)} €`, SOURCE_LABELS[name] ?? name]}
                contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend
                formatter={(name: string) => SOURCE_LABELS[name] ?? name}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {activeSources.map((src, i) => (
                <Bar key={src} dataKey={src} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Donut + legendă laterală — distribuție per sursă */}
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>Distribuție per sursă</h4>
        {bySource.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nu există date.</p>
        ) : (() => {
          const grandTotal = bySource.reduce((s, r) => s + r.total, 0)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flexShrink: 0, width: 160, height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bySource}
                      dataKey="total"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      strokeWidth={0}
                    >
                      {bySource.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(2)} €`]}
                      contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                {bySource.map((r, i) => {
                  const pct = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0
                  return (
                    <div key={r.source} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {pct.toFixed(0)}%
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                        {r.total >= 1000 ? `${(r.total / 1000).toFixed(1)}k €` : `${r.total.toFixed(0)} €`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

    </div>
  )
}
