import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { BulkIncrementDialog } from './BulkIncrementDialog'
import { renderWithQueryClient } from '@/test/renderWithProviders'

vi.mock('@/lib/api', () => ({
  api: {
    listDepartments: vi.fn().mockResolvedValue([{ id: 1, name: 'Engineering' }]),
    bulkIncrement: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('BulkIncrementDialog', () => {
  it('disables preview until a department or country is chosen', async () => {
    renderWithQueryClient(<BulkIncrementDialog open onOpenChange={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Preview (dry run)' })).toBeDisabled()
  })

  it('runs a dry run and shows the preview without committing', async () => {
    ;(api.bulkIncrement as Mock).mockResolvedValue({
      dry_run: true,
      affected_count: 2,
      preview: [
        { id: 1, name: 'Alice', currency: 'USD', old_salary: 100000, new_salary: 105000 },
        { id: 2, name: 'Bob', currency: 'USD', old_salary: 80000, new_salary: 84000 },
      ],
    })
    const user = userEvent.setup()
    renderWithQueryClient(<BulkIncrementDialog open onOpenChange={vi.fn()} />)

    await user.click((await screen.findByText('Not scoped by department')).closest('button')!)
    await user.click(await screen.findByText('Engineering'))
    await user.click(screen.getByRole('button', { name: 'Preview (dry run)' }))

    expect(await screen.findByText(/Preview - 2 employee\(s\) affected/)).toBeInTheDocument()
    expect(api.bulkIncrement).toHaveBeenCalledWith(expect.objectContaining({ dry_run: true, department: 1 }))
    expect(screen.getByRole('button', { name: 'Commit' })).toBeEnabled()
  })

  it('commits after a preview and shows the applied state', async () => {
    ;(api.bulkIncrement as Mock)
      .mockResolvedValueOnce({
        dry_run: true,
        affected_count: 1,
        preview: [{ id: 1, name: 'Alice', currency: 'USD', old_salary: 100000, new_salary: 105000 }],
      })
      .mockResolvedValueOnce({
        dry_run: false,
        affected_count: 1,
        preview: [{ id: 1, name: 'Alice', currency: 'USD', old_salary: 100000, new_salary: 105000 }],
      })
    const user = userEvent.setup()
    renderWithQueryClient(<BulkIncrementDialog open onOpenChange={vi.fn()} />)

    await user.click((await screen.findByText('Not scoped by department')).closest('button')!)
    await user.click(await screen.findByText('Engineering'))
    await user.click(screen.getByRole('button', { name: 'Preview (dry run)' }))
    await screen.findByText(/Preview - 1 employee\(s\) affected/)

    await user.click(screen.getByRole('button', { name: 'Commit' }))

    expect(await screen.findByText(/Applied - 1 employee\(s\) affected/)).toBeInTheDocument()
    await waitFor(() => expect(api.bulkIncrement).toHaveBeenLastCalledWith(expect.objectContaining({ dry_run: false })))
  })
})
