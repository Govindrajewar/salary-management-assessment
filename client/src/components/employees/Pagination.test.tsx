import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('shows the current range and total count', () => {
    render(
      <Pagination page={2} pageSize={25} count={60} hasNext hasPrevious onPageChange={vi.fn()} />,
    )
    expect(screen.getByText('Showing 26-50 of 60')).toBeInTheDocument()
  })

  it('disables Previous on the first page', () => {
    render(
      <Pagination page={1} pageSize={25} count={60} hasNext hasPrevious={false} onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('disables Next on the last page', () => {
    render(
      <Pagination page={3} pageSize={25} count={60} hasNext={false} hasPrevious onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('calls onPageChange with the next/previous page number', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={25} count={60} hasNext hasPrevious onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('shows "No results" when count is zero', () => {
    render(<Pagination page={1} pageSize={25} count={0} hasNext={false} hasPrevious={false} onPageChange={vi.fn()} />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
