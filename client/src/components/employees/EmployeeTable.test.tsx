import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeTable } from './EmployeeTable'
import type { Employee } from '@/lib/api'

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    name: 'Alice Active',
    email: 'alice@example.com',
    department: 1,
    department_name: 'Engineering',
    country: 'US',
    currency: 'USD',
    base_salary: '100000.00',
    employment_status: 'active',
    hire_date: '2020-01-01',
    termination_date: null,
    manager: null,
    manager_name: null,
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('EmployeeTable', () => {
  it('renders a row per employee with formatted salary', () => {
    render(
      <EmployeeTable
        employees={[makeEmployee()]}
        isLoading={false}
        isError={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Alice Active')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows an empty state when there are no employees', () => {
    render(
      <EmployeeTable employees={[]} isLoading={false} isError={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByText(/no employees match these filters/i)).toBeInTheDocument()
  })

  it('shows a loading skeleton and no empty-state message while loading', () => {
    render(
      <EmployeeTable employees={[]} isLoading={true} isError={false} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.queryByText(/no employees match these filters/i)).not.toBeInTheDocument()
  })

  it('shows an error message and no rows when the query failed', () => {
    render(
      <EmployeeTable
        employees={[makeEmployee()]}
        isLoading={false}
        isError={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText(/failed to load employees/i)).toBeInTheDocument()
    expect(screen.queryByText('Alice Active')).not.toBeInTheDocument()
  })

  it('calls onEdit and onDelete with the clicked employee', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const employee = makeEmployee()
    render(
      <EmployeeTable employees={[employee]} isLoading={false} isError={false} onEdit={onEdit} onDelete={onDelete} />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(employee)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(employee)
  })

  it('shows terminated status as a distinct badge', () => {
    render(
      <EmployeeTable
        employees={[makeEmployee({ employment_status: 'terminated' })]}
        isLoading={false}
        isError={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('terminated')).toBeInTheDocument()
  })

  it('shows a dash when the employee has no manager', () => {
    render(
      <EmployeeTable
        employees={[makeEmployee({ manager_name: null })]}
        isLoading={false}
        isError={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
