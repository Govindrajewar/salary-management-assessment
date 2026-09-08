import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useDepartmentsQuery } from '@/hooks/useDepartments'
import {
  useCreateEmployee,
  useUpdateEmployee,
  useSalaryHistoryQuery,
  isConflict,
} from '@/hooks/useEmployees'
import { COUNTRIES, formatSalary } from '@/lib/constants'
import { ApiError, type Employee } from '@/lib/api'

export interface EmployeeFormSheetProps {
  open: boolean
  employee: Employee | null // null = create mode
  onOpenChange: (open: boolean) => void
}

interface FormState {
  name: string
  email: string
  department: string
  country: string
  currency: string
  base_salary: string
  employment_status: 'active' | 'terminated'
  hire_date: string
  termination_date: string
  salary_change_reason: string
}

function initialState(employee: Employee | null): FormState {
  if (!employee) {
    return {
      name: '',
      email: '',
      department: '',
      country: 'US',
      currency: 'USD',
      base_salary: '',
      employment_status: 'active',
      hire_date: new Date().toISOString().slice(0, 10),
      termination_date: '',
      salary_change_reason: '',
    }
  }
  return {
    name: employee.name,
    email: employee.email,
    department: String(employee.department),
    country: employee.country,
    currency: employee.currency,
    base_salary: employee.base_salary,
    employment_status: employee.employment_status,
    hire_date: employee.hire_date,
    termination_date: employee.termination_date ?? '',
    salary_change_reason: '',
  }
}

export function EmployeeFormSheet({ open, employee, onOpenChange }: EmployeeFormSheetProps) {
  const isEdit = employee !== null
  const { data: departments } = useDepartmentsQuery()
  const { data: history } = useSalaryHistoryQuery(isEdit ? employee.id : null)
  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()

  const [form, setForm] = useState<FormState>(() => initialState(employee))
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    setForm(initialState(employee))
    setConflict(false)
  }, [employee, open])

  const mutation = isEdit ? updateMutation : createMutation
  const fieldErrors =
    mutation.error instanceof ApiError && typeof mutation.error.body === 'object' && mutation.error.body
      ? (mutation.error.body as Record<string, string[] | string>)
      : null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleCountryChange(code: string) {
    const country = COUNTRIES.find((c) => c.code === code)
    setForm((prev) => ({ ...prev, country: code, currency: country?.currency ?? prev.currency }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setConflict(false)

    const payload = {
      name: form.name,
      email: form.email,
      department: Number(form.department),
      country: form.country,
      currency: form.currency,
      base_salary: form.base_salary,
      employment_status: form.employment_status,
      hire_date: form.hire_date,
      termination_date: form.employment_status === 'terminated' ? form.termination_date : null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: employee.id,
          data: {
            ...payload,
            expected_updated_at: employee.updated_at,
            salary_change_reason: form.salary_change_reason || undefined,
          },
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (err) {
      if (isConflict(err)) {
        setConflict(true)
      }
      // other errors are surfaced via fieldErrors below
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit ${employee.name}` : 'Add employee'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Changes to salary are recorded in the audit trail below.' : 'Create a new employee record.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
          {conflict && (
            <Alert variant="destructive">
              <AlertTitle>Someone else changed this record</AlertTitle>
              <AlertDescription>Close this form and reopen the employee to see the latest data before retrying.</AlertDescription>
            </Alert>
          )}

          {fieldErrors && !conflict && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't save</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc">
                  {Object.entries(fieldErrors).map(([field, msg]) => (
                    <li key={field}>
                      {field}: {Array.isArray(msg) ? msg.join(', ') : String(msg)}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => set('department', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                required
                maxLength={3}
                value={form.currency}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="salary">Base salary ({form.currency})</Label>
              <Input
                id="salary"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.base_salary}
                onChange={(e) => set('base_salary', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Status</Label>
              <Select
                value={form.employment_status}
                onValueChange={(v) => set('employment_status', v as 'active' | 'terminated')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="hire_date">Hire date</Label>
              <Input
                id="hire_date"
                type="date"
                required
                value={form.hire_date}
                onChange={(e) => set('hire_date', e.target.value)}
              />
            </div>
            {form.employment_status === 'terminated' && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="termination_date">Termination date</Label>
                <Input
                  id="termination_date"
                  type="date"
                  required
                  value={form.termination_date}
                  onChange={(e) => set('termination_date', e.target.value)}
                />
              </div>
            )}
            {isEdit && (
              <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="reason">Reason for salary change (if any)</Label>
                <Input
                  id="reason"
                  placeholder="e.g. Annual raise, promotion"
                  value={form.salary_change_reason}
                  onChange={(e) => set('salary_change_reason', e.target.value)}
                />
              </div>
            )}
          </div>

          {isEdit && history && history.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Salary history</Label>
              <ul className="max-h-40 overflow-y-auto rounded-md border text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between border-b px-3 py-2 last:border-b-0">
                    <span>{h.effective_date}</span>
                    <span className="text-muted-foreground">{h.reason}</span>
                    <span>
                      {formatSalary(h.old_salary, h.currency)} → {formatSalary(h.new_salary, h.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
