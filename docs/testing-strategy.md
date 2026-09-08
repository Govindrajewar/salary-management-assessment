# Testing Strategy

## Backend — `pytest` + `pytest-django`
Location: `server/salaries/tests/`. Factories in `tests/factories.py` keep test setup declarative instead of hand-building model instances per test.

- `test_models.py` — model-level constraints: `base_salary >= 0`, `termination_date >= hire_date`, uniqueness on email/department name.
- `test_employee_crud.py` — create/read/update/delete via the API, including validation errors.
- `test_filters_and_search.py` — every filter (`department`, `country`, `currency`, `employment_status`, `salary_min/max`, `search`, `ordering`) in isolation and combined.
- `test_dashboard.py` — stats grouping/aggregation, currency segmentation, `include_terminated` toggle.
- `test_bulk_increment.py` — dry-run preview matches what a real commit would do, percent bounds rejected outside `(-100, 100]`, `SalaryChange` rows written per affected employee.
- `test_concurrency.py` — stale `expected_updated_at` returns `409`, correct value succeeds.
- `test_csv_export.py` — export respects active filters, streams without loading the full queryset.
- `test_salary_history.py` — history endpoint returns append-only rows in the right order; confirms no update/delete path exists for them.
- `test_seed_command.py` — seed command is deterministic (same seed → same data) and produces the expected awkward-row proportions (terminated, manager-less, extreme salaries).

Run: `pytest` from `server/`.

## Frontend — Vitest + React Testing Library
Location: colocated `*.test.tsx` next to the components they cover, plus a shared `client/src/test/renderWithProviders.tsx` helper that wraps components with the TanStack Query client and router so tests don't repeat that setup.

- `EmployeeTable.test.tsx` — renders rows, sorting/column behavior.
- `EmployeeFilterBar.test.tsx` — filter inputs update query state.
- `EmployeeFormSheet.test.tsx` — create/edit form validation and submission.
- `Pagination.test.tsx` — page navigation controls.
- `BulkIncrementDialog.test.tsx` — dry-run preview render, confirm/cancel flow.
- `DashboardPage.test.tsx` — stats rendering, chart data wiring.

Run: `npm run test` (Vitest) from `client/`.

## What's deliberately not covered
- End-to-end/browser tests (Playwright/Cypress) — component + API test layers give faster feedback for this scope; see tradeoffs.md.
- Load/performance testing beyond the 10k-row seed acting as a realistic dataset size for manual and automated checks.
