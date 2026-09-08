import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { renderWithQueryClient } from '@/test/renderWithProviders'

vi.mock('@/lib/api', () => ({
  api: {
    dashboardStats: vi.fn().mockResolvedValue({
      by_department: [
        { department__name: 'Engineering', currency: 'USD', count: 2, avg: 100000, median: 100000, min: 90000, max: 110000 },
        { department__name: 'Engineering', currency: 'INR', count: 3, avg: 2000000, median: 2000000, min: 1800000, max: 2200000 },
      ],
      by_country: [
        { country: 'US', currency: 'USD', count: 2, avg: 100000, median: 100000, min: 90000, max: 110000 },
        { country: 'IN', currency: 'INR', count: 3, avg: 2000000, median: 2000000, min: 1800000, max: 2200000 },
      ],
    }),
  },
}))

// Currencies sort alphabetically, so 'INR' (not 'USD') is the initial selection.
describe('DashboardPage', () => {
  it('defaults to one currency (alphabetically first) and never merges them', async () => {
    renderWithQueryClient(<DashboardPage />)

    expect(await screen.findByText(/Average salary by department \(INR\)/)).toBeInTheDocument()
    expect(screen.getAllByText('Engineering')).toHaveLength(1)
    expect(screen.getAllByText('₹2,000,000').length).toBeGreaterThan(0)
    expect(screen.queryByText('$100,000')).not.toBeInTheDocument()
  })

  it('switches currency via the selector without mixing rows', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<DashboardPage />)
    await screen.findByText(/Average salary by department \(INR\)/)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'USD' }))

    expect(await screen.findByText(/Average salary by department \(USD\)/)).toBeInTheDocument()
    expect(screen.getAllByText('Engineering')).toHaveLength(1)
    expect(screen.getAllByText('$100,000').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByText('₹2,000,000')).not.toBeInTheDocument())
  })
})
