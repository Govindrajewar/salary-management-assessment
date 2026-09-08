import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmployeeFilterBar } from '@/components/employees/EmployeeFilterBar'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { EmployeeFormSheet } from '@/components/employees/EmployeeFormSheet'
import { BulkIncrementDialog } from '@/components/employees/BulkIncrementDialog'
import { Pagination } from '@/components/employees/Pagination'
import { useEmployeesQuery, useDeleteEmployee } from '@/hooks/useEmployees'
import { api, type Employee, type EmployeeFilters } from '@/lib/api'

const PAGE_SIZE = 25

export function EmployeesPage() {
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data, isLoading, isError, isFetching } = useEmployeesQuery(filters)
  const deleteMutation = useDeleteEmployee()

  function openCreate() {
    setEditingEmployee(null)
    setFormOpen(true)
  }

  function openEdit(employee: Employee) {
    setEditingEmployee(employee)
    setFormOpen(true)
  }

  function handleDelete(employee: Employee) {
    if (window.confirm(`Delete ${employee.name}? This cannot be undone.`)) {
      deleteMutation.mutate(employee.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Employees</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Bulk increment
          </Button>
          <Button variant="outline" asChild>
            <a href={api.exportCsvUrl(filters)}>Export CSV</a>
          </Button>
          <Button onClick={openCreate}>Add employee</Button>
        </div>
      </div>

      <EmployeeFilterBar filters={filters} onChange={setFilters} />

      <EmployeeTable
        employees={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {data && (
        <Pagination
          page={filters.page ?? 1}
          pageSize={PAGE_SIZE}
          count={data.count}
          hasNext={Boolean(data.next) && !isFetching}
          hasPrevious={Boolean(data.previous) && !isFetching}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      )}

      <EmployeeFormSheet open={formOpen} employee={editingEmployee} onOpenChange={setFormOpen} />
      <BulkIncrementDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  )
}
