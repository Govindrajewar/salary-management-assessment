# API Design

Base path: `/api/`. JSON in/out. No auth (see requirements.md).

## Employees
- `GET /api/employees/` — paginated list. Query params: `department`, `country` (iexact), `currency` (iexact), `employment_status` (iexact), `salary_min`, `salary_max`, `search` (name/email), `ordering` (`name`, `base_salary`, `hire_date`, `department__name`, `country`, prefix `-` for desc).
- `POST /api/employees/` — create.
- `GET /api/employees/{id}/` — detail.
- `PATCH /api/employees/{id}/` — partial update. **Requires `expected_updated_at`** in the body (see Concurrency below). A salary change also requires the caller to submit a `reason`; the view writes the corresponding `SalaryChange` row in the same request.
- `PUT /api/employees/{id}/` — full update, same concurrency rule.
- `DELETE /api/employees/{id}/` — hard delete (cascades `SalaryChange` rows for that employee).

Pagination: `PageNumberPagination`, `PAGE_SIZE=25`, standard `count`/`next`/`previous`/`results` envelope.

## Salary history
- `GET /api/employees/{id}/salary-history/` — full audit trail for one employee, newest first. Read-only; there is no write endpoint for this resource because rows are only ever created as a side effect of an employee salary edit or a bulk increment.

## Bulk increment
- `POST /api/salary/bulk-increment/`
  - Body: `{ department | country, percent, reason, dry_run }` — exactly one of `department`/`country` scopes the operation.
  - `percent` validated to `(-100, 100]` before touching the DB — a -100% or below would mean a negative salary.
  - `dry_run: true` returns the computed per-employee old/new values and a count, without writing anything.
  - `dry_run: false` (or omitted) commits: one `SalaryChange` row per affected employee, `base_salary` updated via `bulk_update`, all inside a single `transaction.atomic()` — either every employee in scope is raised or none are.

## Departments
- `GET /api/departments/` — read-only list, used to populate filter/scope dropdowns.

## Dashboard
- `GET /api/dashboard/stats/?include_terminated=` — avg/median/min/max `base_salary`, grouped by (department, currency) and by (country, currency). `include_terminated` (default false) controls whether terminated employees are folded into the numbers. Always currency-segmented — see decisions.md.

## Export
- `GET /api/employees/export/` — CSV of the current filtered view (accepts the same filter query params as the list endpoint). Streamed via a chunked queryset iterator rather than materializing all matching rows in memory first.

## Concurrency
`PATCH`/`PUT` on an employee require `expected_updated_at` in the request body. If it doesn't match the row's current `updated_at`, the request fails with `409 Conflict` and the current record, instead of silently overwriting a change made from another tab/session. See decisions.md.

## Error shape
Validation errors return `400` with a DRF-standard `{field: [messages]}` body. Concurrency conflicts return `409` with the current record under a `current` key. Not-found returns `404`.
