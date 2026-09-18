import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCompareCountriesQuery(
  country1: string | null,
  country2: string | null,
  currency: string | null,
  includeTerminated: boolean,
) {
  return useQuery({
    queryKey: ['compare-countries', country1, country2, currency, includeTerminated],
    queryFn: () =>
      api.compareCountries(country1 as string, country2 as string, currency as string, includeTerminated),
    enabled: Boolean(country1 && country2 && currency),
  })
}
