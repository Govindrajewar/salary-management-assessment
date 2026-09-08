# Performance

Target scale: ~10,000 employees, single HR Manager as the sole concurrent-ish user. Every choice below is sized for that, not for millions of rows.

## Seed data (10k employees)
`server/salaries/management/commands/seed_employees.py` uses `bulk_create`/`bulk_update` in batches of 1,000 inside `transaction.atomic()` per batch, rather than one `Employee.objects.create()` per row (~10,000 individual INSERT round trips). Manager assignment is a two-pass process (create all employees first, then assign managers) so it can't reference a manager row that doesn't exist yet. Salary-history seeding reads employees back via `.iterator(chunk_size=1000)` to avoid loading all 10k rows into memory at once.

## List/filter endpoint
- Filtering (`department`, `country`, `currency`, `employment_status`, `salary_min/max`, `search`) is pushed to Postgres via `django-filter`, not fetched-then-filtered in Python.
- Indexes on `department`, `country`, `employment_status`, `currency` back exactly these filters.
- `PageNumberPagination` (`PAGE_SIZE=25`) means a page load is a bounded query, not a full-table fetch — the client never holds all 10k rows.

## Dashboard stats
Aggregation (avg/median/min/max by department+currency and country+currency) is computed via grouped DB queries (`.values(...)` + aggregation), i.e. one query per grouping rather than pulling every employee row into Python and reducing there.

## CSV export
Streamed via `.iterator(chunk_size=1000)` against the filtered queryset, so memory use stays bounded regardless of how many rows match — exporting all 10k (or more) doesn't require materializing them all at once.

## Bulk increment
Scoped update (`bulk_update`) rather than one `UPDATE` per employee, and a dry-run mode that computes the full preview without touching the DB at all — so previewing a large-scope raise costs one read pass, not a read-plus-write.

## Not optimized (by design)
- No caching layer (Redis, etc.) — read volume at this scale doesn't need it, and it would add invalidation complexity for no measured benefit.
- No connection pooler beyond Django's own (`conn_max_age=600`) — a single-instance deployment at this traffic level doesn't need PgBouncer.
- No async views — DRF's synchronous request handling is not a bottleneck at this scale or concurrency.
