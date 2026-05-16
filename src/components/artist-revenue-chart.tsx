'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Revenue = {
  id: string
  period: string
  amount: number
  source: string
}

type Props = {
  revenues: Revenue[]
}

export function ArtistRevenueChart({ revenues }: Props) {
  const grouped = revenues.reduce<Record<string, number>>((acc, r) => {
    acc[r.period] = (acc[r.period] ?? 0) + r.amount
    return acc
  }, {})

  const data = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, total: Math.round(total) }))

  if (data.length === 0) {
    return <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Nu există date de venituri înregistrate.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} unit=" €" />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
          formatter={(val) => [`${val} €`, 'Venituri']}
        />
        <Bar dataKey="total" fill="var(--role-artist, #f87171)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
