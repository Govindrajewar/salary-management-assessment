# Architecture

## Overview
```
┌─────────────┐        HTTPS/JSON         ┌──────────────────┐         ┌────────────┐
│  client     │ ──────────────────────▶  │  server           │ ─────▶ │ PostgreSQL │
│  React+Vite │ ◀──────────────────────  │  Django + DRF     │ ◀───── │            │
└─────────────┘                           └──────────────────┘         └────────────┘
   Vercel                                     Render                       Render
```

## Data model
- **Department**: `id, name (unique)`
- **Employee**: `id, name, email (unique), department (FK), country, currency (ISO 4217), base_salary (decimal, >=0), employment_status (active|terminated), hire_date, termination_date (nullable), manager (FK to self, nullable), updated_at`
- **SalaryChange** (audit trail, append-only): `id, employee (FK), old_salary, new_salary, currency, effective_date, reason, created_at`

Indexes on `department`, `country`, `employment_status`, `currency` for filter performance at 10k+ rows.

## Why these choices
- **Currency stored per-employee, stats segmented by currency**: aggregating €/₹/$ into one number is either wrong or requires FX rates that go stale. Segmenting is the honest answer.
- **SalaryChange as append-only audit log rather than mutating `base_salary` in place**: HR needs "why is this person paid what they're paid" — a single mutable field can't answer that. Every edit (including bulk increments) writes one row here.
- **Optimistic concurrency (`updated_at` check on PATCH)**: at 10k rows the HR Manager may have two browser tabs/sessions; last-write-wins silently drops a change. A version check returns a 409 instead.
- **Server-side pagination + filtering** (not client-side over all 10k rows): a naive "fetch all, filter in browser" doesn't scale and makes the first page load slow. Django REST Framework filtering/pagination pushes the work to Postgres, which indexes handle cheaply.
- **Bulk increment as its own endpoint with a dry-run mode**: a department-wide raise is one HTTP call away from an expensive mistake; dry-run returns the computed diffs without persisting, so the HR Manager confirms before commit. The real commit is wrapped in one DB transaction — a failure partway through rolls back everything rather than leaving half the department raised.

## API surface (high level)
- `GET/POST /api/employees/` — list (filter/search/paginate) & create
- `GET/PATCH /api/employees/{id}/` — detail & edit (optimistic concurrency via `updated_at`)
- `GET /api/employees/{id}/salary-history/` — audit trail for one employee
- `GET /api/employees/export/` — CSV of current filtered view
- `POST /api/salary/bulk-increment/` — `{scope: {department|country}, percent, dry_run: bool}`
- `GET /api/departments/`
- `GET /api/dashboard/stats/` — avg/median/min/max, grouped by department and country, per currency

## Trade-offs / deliberately simple
- No auth layer (see requirements.md exclusions) — API is open within its deployed environment.
- No FX conversion service.
- Seed data is synthetic/deterministic (fixed random seed), not real employee data.

## Performance notes
- 10k-row seed uses batched `bulk_create` (Django ORM single-row inserts would be ~10k round trips).
- List endpoint pagination is page-based with a capped page size; dashboard stats are pre-aggregated via DB `GROUP BY`, not computed in Python over all rows.
