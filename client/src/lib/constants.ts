/**
 * Countries/currencies used by the seed data (server/salaries/management/commands/seed_employees.py).
 * Kept as a small static list here rather than a new backend endpoint - low churn reference
 * data, not worth an API round trip for a handful of dropdown options.
 */
export const COUNTRIES = [
  { code: 'US', label: 'United States', currency: 'USD' },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', label: 'Germany', currency: 'EUR' },
  { code: 'FR', label: 'France', currency: 'EUR' },
  { code: 'IN', label: 'India', currency: 'INR' },
  { code: 'CA', label: 'Canada', currency: 'CAD' },
  { code: 'AU', label: 'Australia', currency: 'AUD' },
  { code: 'JP', label: 'Japan', currency: 'JPY' },
  { code: 'BR', label: 'Brazil', currency: 'BRL' },
  { code: 'SG', label: 'Singapore', currency: 'SGD' },
] as const

export const CURRENCIES = [...new Set(COUNTRIES.map((c) => c.currency))].sort()

// Fixed locale ('en-US'), not the viewer's OS/browser locale: digit grouping must stay
// consistent for every HR Manager looking at the same numbers, regardless of where
// they're sitting - the OS default can silently switch to a different grouping system
// (e.g. lakhs/crores) even for a currency like USD that has nothing to do with it.
const SALARY_LOCALE = 'en-US'

export function formatSalary(amount: number | string, currency: string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  try {
    return new Intl.NumberFormat(SALARY_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString(SALARY_LOCALE)}`
  }
}
