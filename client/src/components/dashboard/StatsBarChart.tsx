import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatSalary } from '@/lib/constants'
import type { DashboardStatRow } from '@/lib/api'

export interface StatsBarChartProps {
  rows: DashboardStatRow[]
  labelKey: 'department__name' | 'country'
  currency: string
}

export function StatsBarChart({ rows, labelKey, currency }: StatsBarChartProps) {
  const data = rows.map((row) => ({
    label: row[labelKey] ?? 'Unknown',
    avg: row.avg,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--chart-axis)' }} />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--chart-axis)' }}
          tickFormatter={(v) => formatSalary(v, currency)}
          width={90}
        />
        <Tooltip formatter={(value) => formatSalary(Number(value), currency)} />
        <Bar dataKey="avg" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
