import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeFilterBar } from './EmployeeFilterBar'
import { renderWithQueryClient } from '@/test/renderWithProviders'
import type { EmployeeFilters } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    listDepartments: vi.fn().mockResolvedValue([{ id: 1, name: 'Engineering' }]),
  },
}))

describe('EmployeeFilterBar', () => {
  it('debounces search input before calling onChange', async () => {
    const onChange = vi.fn()
    const filters: EmployeeFilters = { page: 1 }

    renderWithQueryClient(<EmployeeFilterBar filters={filters} onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('Name or email'), { target: { value: 'Aaron' } })
    expect(onChange).not.toHaveBeenCalled()

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ page: 1, search: 'Aaron' }), {
      timeout: 1000,
    })
  })

  it('resets page to 1 and clears search when Clear filters is clicked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const onChange = vi.fn()
    const filters: EmployeeFilters = { page: 3, department: 1, search: 'x' }

    renderWithQueryClient(<EmployeeFilterBar filters={filters} onChange={onChange} />)

    await user.click(screen.getByText('Clear filters'))
    expect(onChange).toHaveBeenCalledWith({ page: 1 })
  })

  it('sets department filter and resets page to 1 on select', async () => {
    const onChange = vi.fn()
    renderWithQueryClient(<EmployeeFilterBar filters={{ page: 2 }} onChange={onChange} />)

    const user = userEvent.setup()
    await user.click(screen.getByText('All countries').closest('button')!)
    await user.click(await screen.findByText('India'))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ country: 'IN', page: 1 }))
  })
})
