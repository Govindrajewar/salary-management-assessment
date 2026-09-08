import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type BulkIncrementRequest } from '@/lib/api'
import { employeeKeys } from '@/hooks/useEmployees'

export function useBulkIncrement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkIncrementRequest) => api.bulkIncrement(data),
    onSuccess: (result) => {
      if (!result.dry_run) {
        queryClient.invalidateQueries({ queryKey: employeeKeys.all })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      }
    },
  })
}
