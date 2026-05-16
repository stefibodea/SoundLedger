'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

export type MonthlyRevenue = { period: string; total: number }
export type SourceRevenue  = { source: string; total: number }

const SOURCE_LABELS: Record<string, string> = {
  STREAMING:   'Spotify',
  YOUTUBE:     'YouTube',
  APPLE_MUSIC: 'Apple Music',
  LICENSING:   'Licențiere',
  PHYSICAL:    'Vânzări fizice',
  SYNC:        'Sync',
}

const COLORS = ['#22c55e', '#ef4444', '#ec4899', '#6366f1', '#94a3b8', '#f59e0b']

export function RevenueCharts({ monthly, bySource }: { monthly: MonthlyRevenue[]; bySource: SourceRevenue[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>Venituri per lună</h4>
        {monthly.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nu există date.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `${v} €`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`, 'Total']} />
              <Bar dataKey="total" fill="var(--primary, #6366f1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h4 style={{ marginBottom: 16 }}>Distribuție per sursă</h4>
        {bySource.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Nu există date.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={bySource}
                dataKey="total"
                nameKey="source"
                cx="50%"
                cy="55%"
                outerRadius={75}
                label={({ source, percent }) =>
                  `${SOURCE_LABELS[source] ?? source} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {bySource.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
