import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => api.listDepartments(),
    staleTime: 5 * 60_000,
  })
}
