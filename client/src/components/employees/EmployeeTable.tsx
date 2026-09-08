import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSalary } from '@/lib/constants'
import type { Employee } from '@/lib/api'

export interface EmployeeTableProps {
  employees: Employee[]
  isLoading: boolean
  isError: boolean
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

const columns: ColumnDef<Employee>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'department_name', header: 'Department' },
  { accessorKey: 'country', header: 'Country' },
  {
    id: 'salary',
    header: 'Salary',
    cell: ({ row }) => formatSalary(row.original.base_salary, row.original.currency),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.employment_status === 'active' ? 'default' : 'secondary'}>
        {row.original.employment_status}
      </Badge>
    ),
  },
  { accessorKey: 'manager_name', header: 'Manager', cell: ({ getValue }) => getValue() ?? '—' },
]

export function EmployeeTable({ employees, isLoading, isError, onEdit, onDelete }: EmployeeTableProps) {
  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isError) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-destructive">
        Failed to load employees. Try again.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((_col, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            ))}

          {!isLoading && employees.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground">
                No employees match these filters.
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => onEdit(row.original)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(row.original)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
