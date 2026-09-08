import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDashboardStatsQuery(includeTerminated: boolean) {
  return useQuery({
    queryKey: ['dashboard-stats', includeTerminated],
    queryFn: () => api.dashboardStats(includeTerminated),
  })
}
