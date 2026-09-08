import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useDepartmentsQuery } from '@/hooks/useDepartments'
import { useBulkIncrement } from '@/hooks/useBulkIncrement'
import { COUNTRIES, formatSalary } from '@/lib/constants'
import type { BulkIncrementResponse } from '@/lib/api'

const NONE = '__none__'

export interface BulkIncrementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkIncrementDialog({ open, onOpenChange }: BulkIncrementDialogProps) {
  const { data: departments } = useDepartmentsQuery()
  const bulkIncrement = useBulkIncrement()

  const [department, setDepartment] = useState(NONE)
  const [country, setCountry] = useState(NONE)
  const [percent, setPercent] = useState('5')
  const [reason, setReason] = useState('Annual raise')
  const [preview, setPreview] = useState<BulkIncrementResponse | null>(null)
  const [committed, setCommitted] = useState(false)

  function reset() {
    setPreview(null)
    setCommitted(false)
    bulkIncrement.reset()
  }

  async function runDryRun() {
    setCommitted(false)
    const result = await bulkIncrement.mutateAsync({
      department: department !== NONE ? Number(department) : undefined,
      country: country !== NONE ? country : undefined,
      percent: Number(percent),
      reason,
      dry_run: true,
    })
    setPreview(result)
  }

  async function commit() {
    const result = await bulkIncrement.mutateAsync({
      department: department !== NONE ? Number(department) : undefined,
      country: country !== NONE ? country : undefined,
      percent: Number(percent),
      reason,
      dry_run: false,
    })
    setPreview(result)
    setCommitted(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk salary increment</DialogTitle>
          <DialogDescription>
            Apply a percentage raise to every active employee in a department or country. Always preview before committing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Not scoped by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not scoped by department</SelectItem>
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
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Not scoped by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not scoped by country</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="percent">Percent increase</Label>
            <Input
              id="percent"
              type="number"
              step="0.1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="bulk-reason">Reason</Label>
            <Input id="bulk-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {department === NONE && country === NONE && (
            <Alert>
              <AlertDescription>Choose a department or country to scope the increment.</AlertDescription>
            </Alert>
          )}

          {bulkIncrement.isError && (
            <Alert variant="destructive">
              <AlertTitle>Couldn't run increment</AlertTitle>
              <AlertDescription>{(bulkIncrement.error as Error).message}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="flex flex-col gap-2">
              <Alert variant={committed ? 'default' : undefined}>
                <AlertTitle>
                  {committed ? 'Applied' : 'Preview'} - {preview.affected_count} employee(s) affected
                </AlertTitle>
                <AlertDescription>
                  {committed
                    ? 'Salaries updated and recorded in the audit trail.'
                    : 'Nothing has been saved yet. Review below, then commit.'}
                </AlertDescription>
              </Alert>
              <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
                {preview.preview.slice(0, 50).map((row) => (
                  <li key={row.id} className="flex justify-between border-b px-3 py-1.5 last:border-b-0">
                    <span>{row.name}</span>
                    <span>
                      {formatSalary(row.old_salary, row.currency)} → {formatSalary(row.new_salary, row.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {preview.preview.length > 50 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 50 of {preview.preview.length}.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!committed && (
            <>
              <Button
                variant="outline"
                onClick={runDryRun}
                disabled={bulkIncrement.isPending || (department === NONE && country === NONE)}
              >
                Preview (dry run)
              </Button>
              <Button
                onClick={commit}
                disabled={!preview || bulkIncrement.isPending}
              >
                Commit
              </Button>
            </>
          )}
          {committed && <Button onClick={() => onOpenChange(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
