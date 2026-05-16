'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type ChartPoint = { month: string; amount: number }

type Props = { data: ChartPoint[] }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-medium)',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--role-ar-dark)' }}>
        {payload[0].value.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
      </div>
    </div>
  )
}

export function RevenueChart({ data }: Props) {
  const hasData = data.some((d) => d.amount > 0)

  if (!hasData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 200, color: 'var(--text-secondary)', textAlign: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <p style={{ fontSize: 13, margin: 0 }}>
          Nu sunt suficiente date pentru a afișa o evoluție.<br />
          Continuă să adaugi venituri.
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#4ade80" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#4ade80"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#4ade80', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
