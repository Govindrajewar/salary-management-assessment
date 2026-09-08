import { Button } from '@/components/ui/button'

export interface PaginationProps {
  page: number
  pageSize: number
  count: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, count, hasNext, hasPrevious, onPageChange }: PaginationProps) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {count === 0 ? 'No results' : `Showing ${start}-${end} of ${count}`}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={!hasPrevious} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
