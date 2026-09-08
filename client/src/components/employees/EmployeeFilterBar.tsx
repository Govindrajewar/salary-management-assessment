import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useDepartmentsQuery } from '@/hooks/useDepartments'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { COUNTRIES, CURRENCIES } from '@/lib/constants'
import type { EmployeeFilters } from '@/lib/api'

const ALL = '__all__'

export interface EmployeeFilterBarProps {
  filters: EmployeeFilters
  onChange: (next: EmployeeFilters) => void
}

export function EmployeeFilterBar({ filters, onChange }: EmployeeFilterBarProps) {
  const { data: departments } = useDepartmentsQuery()
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  function set<K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) {
    onChange({ ...filters, [key]: value, page: 1 })
  }

  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? '')) {
      set('search', debouncedSearch || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Search</label>
        <Input
          placeholder="Name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Department</label>
        <Select
          value={filters.department ? String(filters.department) : ALL}
          onValueChange={(v) => set('department', v === ALL ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Country</label>
        <Select
          value={filters.country ?? ALL}
          onValueChange={(v) => set('country', v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All countries</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Currency</label>
        <Select
          value={filters.currency ?? ALL}
          onValueChange={(v) => set('currency', v === ALL ? undefined : v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select
          value={filters.employment_status ?? ALL}
          onValueChange={(v) =>
            set('employment_status', v === ALL ? undefined : (v as 'active' | 'terminated'))
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Min salary</label>
        <Input
          type="number"
          className="w-[110px]"
          defaultValue={filters.salary_min ?? ''}
          onChange={(e) => set('salary_min', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Max salary</label>
        <Input
          type="number"
          className="w-[110px]"
          defaultValue={filters.salary_max ?? ''}
          onChange={(e) => set('salary_max', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <Button
        variant="ghost"
        onClick={() => {
          setSearchInput('')
          onChange({ page: 1 })
        }}
        className="text-muted-foreground"
      >
        Clear filters
      </Button>
    </div>
  )
}
