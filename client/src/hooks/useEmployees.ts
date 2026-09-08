import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type Employee, type EmployeeFilters } from '@/lib/api'

export const employeeKeys = {
  all: ['employees'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.all, 'list', filters] as const,
  detail: (id: number) => [...employeeKeys.all, 'detail', id] as const,
  history: (id: number) => [...employeeKeys.all, 'history', id] as const,
}

export function useEmployeesQuery(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => api.listEmployees(filters),
    placeholderData: (prev) => prev,
  })
}

export function useEmployeeQuery(id: number | null) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? -1),
    queryFn: () => api.getEmployee(id as number),
    enabled: id !== null,
  })
}

export function useSalaryHistoryQuery(id: number | null) {
  return useQuery({
    queryKey: employeeKeys.history(id ?? -1),
    queryFn: () => api.salaryHistory(id as number),
    enabled: id !== null,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Employee>) => api.createEmployee(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  })
}

export interface UpdateEmployeeArgs {
  id: number
  data: Partial<Employee> & { expected_updated_at: string; salary_change_reason?: string }
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: UpdateEmployeeArgs) => api.updateEmployee(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      queryClient.invalidateQueries({ queryKey: employeeKeys.history(variables.id) })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  })
}

export function isConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409
}
