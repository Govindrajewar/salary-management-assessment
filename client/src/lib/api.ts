const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export type EmploymentStatus = 'active' | 'terminated'

export interface Department {
  id: number
  name: string
}

export interface Employee {
  id: number
  name: string
  email: string
  department: number
  department_name: string
  country: string
  currency: string
  base_salary: string
  employment_status: EmploymentStatus
  hire_date: string
  termination_date: string | null
  manager: number | null
  manager_name: string | null
  updated_at: string
}

export interface SalaryChange {
  id: number
  old_salary: string
  new_salary: string
  currency: string
  effective_date: string
  reason: string
  created_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface EmployeeFilters {
  page?: number
  search?: string
  department?: number
  country?: string
  currency?: string
  employment_status?: EmploymentStatus
  salary_min?: number
  salary_max?: number
  ordering?: string
}

export interface DashboardStatRow {
  department__name?: string
  country?: string
  currency: string
  count: number
  avg: number
  median: number
  min: number
  max: number
}

export interface DashboardStats {
  by_department: DashboardStatRow[]
  by_country: DashboardStatRow[]
}

export interface BulkIncrementRequest {
  department?: number
  country?: string
  percent: number
  reason?: string
  dry_run: boolean
}

export interface BulkIncrementPreviewRow {
  id: number
  name: string
  currency: string
  old_salary: number
  new_salary: number
}

export interface BulkIncrementResponse {
  dry_run: boolean
  affected_count: number
  preview: BulkIncrementPreviewRow[]
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body && 'detail' in body ? String((body as { detail: unknown }).detail) : `API error ${status}`)
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }
  return body as T
}

function buildQuery(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  listEmployees: (filters: EmployeeFilters = {}) =>
    request<Paginated<Employee>>(`/employees/${buildQuery(filters)}`),

  getEmployee: (id: number) => request<Employee>(`/employees/${id}/`),

  createEmployee: (data: Partial<Employee>) =>
    request<Employee>('/employees/', { method: 'POST', body: JSON.stringify(data) }),

  updateEmployee: (
    id: number,
    data: Partial<Employee> & { expected_updated_at: string; salary_change_reason?: string },
  ) => request<Employee>(`/employees/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteEmployee: (id: number) => request<void>(`/employees/${id}/`, { method: 'DELETE' }),

  salaryHistory: (id: number) => request<SalaryChange[]>(`/employees/${id}/salary-history/`),

  exportCsvUrl: (filters: EmployeeFilters = {}) => `${API_BASE_URL}/employees/export/${buildQuery(filters)}`,

  listDepartments: () => request<Department[]>('/departments/'),

  dashboardStats: (includeTerminated = false) =>
    request<DashboardStats>(`/dashboard/stats/${buildQuery({ include_terminated: includeTerminated })}`),

  bulkIncrement: (data: BulkIncrementRequest) =>
    request<BulkIncrementResponse>('/salary/bulk-increment/', { method: 'POST', body: JSON.stringify(data) }),
}
