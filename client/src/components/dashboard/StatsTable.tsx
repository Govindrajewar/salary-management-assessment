import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSalary } from '@/lib/constants'
import type { DashboardStatRow } from '@/lib/api'

export interface StatsTableProps {
  rows: DashboardStatRow[]
  labelKey: 'department__name' | 'country'
  labelHeader: string
}

export function StatsTable({ rows, labelKey, labelHeader }: StatsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead className="text-right">Count</TableHead>
          <TableHead className="text-right">Avg</TableHead>
          <TableHead className="text-right">Median</TableHead>
          <TableHead className="text-right">Min</TableHead>
          <TableHead className="text-right">Max</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{row[labelKey]}</TableCell>
            <TableCell>{row.currency}</TableCell>
            <TableCell className="text-right">{row.count}</TableCell>
            <TableCell className="text-right">{formatSalary(row.avg, row.currency)}</TableCell>
            <TableCell className="text-right">{formatSalary(row.median, row.currency)}</TableCell>
            <TableCell className="text-right">{formatSalary(row.min, row.currency)}</TableCell>
            <TableCell className="text-right">{formatSalary(row.max, row.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
