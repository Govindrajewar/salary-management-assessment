import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { EmployeeFormSheet } from './EmployeeFormSheet'
import { renderWithQueryClient } from '@/test/renderWithProviders'
import { ApiError, type Employee } from '@/lib/api'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: {
      listDepartments: vi.fn().mockResolvedValue([{ id: 1, name: 'Engineering' }]),
      salaryHistory: vi.fn().mockResolvedValue([]),
      createEmployee: vi.fn(),
      updateEmployee: vi.fn(),
    },
  }
})

import { api } from '@/lib/api'

const employee: Employee = {
  id: 5,
  name: 'Bob Existing',
  email: 'bob@example.com',
  department: 1,
  department_name: 'Engineering',
  country: 'US',
  currency: 'USD',
  base_salary: '90000.00',
  employment_status: 'active',
  hire_date: '2020-01-01',
  termination_date: null,
  manager: null,
  manager_name: null,
  updated_at: '2024-01-01T00:00:00Z',
}

describe('EmployeeFormSheet', () => {
  it('submits a new employee with the entered fields', async () => {
    ;(api.createEmployee as Mock).mockResolvedValue({ ...employee, id: 99 })
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(<EmployeeFormSheet open employee={null} onOpenChange={onOpenChange} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Hire' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.hire@example.com' } })
    fireEvent.change(screen.getByLabelText(/Base salary/), { target: { value: '85000' } })
    await user.click(screen.getByRole('button', { name: 'Create employee' }))

    await waitFor(() => expect(api.createEmployee).toHaveBeenCalled())
    const payload = (api.createEmployee as Mock).mock.calls[0][0]
    expect(payload.name).toBe('New Hire')
    expect(payload.email).toBe('new.hire@example.com')
    expect(payload.base_salary).toBe('85000')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows field errors returned by the API without closing the sheet', async () => {
    ;(api.createEmployee as Mock).mockRejectedValue(
      new ApiError(400, { email: ['employee with this email already exists.'] }),
    )
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(<EmployeeFormSheet open employee={null} onOpenChange={onOpenChange} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dup' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dup@example.com' } })
    fireEvent.change(screen.getByLabelText(/Base salary/), { target: { value: '50000' } })
    await user.click(screen.getByRole('button', { name: 'Create employee' }))

    expect(await screen.findByText(/employee with this email already exists/)).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('shows a conflict alert on a 409 and does not close the sheet', async () => {
    ;(api.updateEmployee as Mock).mockRejectedValue(new ApiError(409, { detail: 'stale' }))
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    renderWithQueryClient(<EmployeeFormSheet open employee={employee} onOpenChange={onOpenChange} />)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/someone else changed this record/i)).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('sends expected_updated_at and an optional reason when editing', async () => {
    ;(api.updateEmployee as Mock).mockResolvedValue(employee)
    const user = userEvent.setup()

    renderWithQueryClient(<EmployeeFormSheet open employee={employee} onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Reason for salary change/), { target: { value: 'Promotion' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updateEmployee).toHaveBeenCalled())
    const [id, data] = (api.updateEmployee as Mock).mock.calls[0]
    expect(id).toBe(employee.id)
    expect(data.expected_updated_at).toBe(employee.updated_at)
    expect(data.salary_change_reason).toBe('Promotion')
  })
})
