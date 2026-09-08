# Decisions

Short ADR-style log. Each entry: decision, why, what it rules out.

## Django + DRF over a Node/Express stack
Decision: backend is Python/Django + Django REST Framework.
Why: the domain (relational data, filtering, aggregation, transactional bulk writes) maps directly onto Django's ORM, `django-filter`, and `transaction.atomic()` — little custom plumbing needed for exactly the primitives this app leans on.
Rules out: a hand-rolled query-builder/migration layer, which a leaner Node stack would have needed to reach the same filtering/transaction guarantees.

## SQLite locally, Postgres in production
Decision: `DATABASE_URL` via `dj_database_url`, defaulting to SQLite when unset.
Why: zero-setup local dev; Postgres in prod for real concurrent-write and constraint behavior (CheckConstraints, `PROTECT`/`CASCADE`/`SET_NULL`) that matches what's actually deployed.
Rules out: relying on SQLite-specific behavior anywhere in application code.

## Currency and country as plain codes, not FK'd lookup tables
Decision: `Employee.country`/`.currency` are validated string codes (ISO 3166-1 alpha-2 / ISO 4217), not foreign keys to `Country`/`Currency` tables.
Why: there's no per-currency or per-country row of behavior in scope (no FX rates, no locale-specific formatting rules beyond a fixed display locale — see tradeoffs.md). A lookup table would add a join for referential integrity this app doesn't otherwise need.
Rules out: enforcing currency/country validity via DB foreign key; enforced instead by field choices/validators.

## SalaryChange as an append-only log, not a mutable field history
Decision: every salary edit writes a new `SalaryChange` row; existing rows are never updated or deleted.
Why: "why is this person paid what they're paid" must be answerable after the fact, including for changes made by bulk increment. A single mutable `base_salary` with no history can't answer that.
Rules out: correcting a mistaken salary entry by editing history — a correction is itself a new `SalaryChange` row.

## Optimistic concurrency via `updated_at`, not row locking
Decision: `PATCH`/`PUT` requires `expected_updated_at`; mismatch returns `409`.
Why: HR Manager is a single persona but may have multiple tabs/sessions open; last-write-wins would silently drop a concurrent edit. A version check surfaces the conflict instead of hiding it.
Rules out: pessimistic locking (`SELECT ... FOR UPDATE`), which would need a lock-hold/timeout model this single-actor app doesn't need.

## Bulk increment: dry-run + single transaction, not fire-and-forget
Decision: `bulk-increment` supports `dry_run` to preview, and the real commit is one `transaction.atomic()` covering every affected row.
Why: a department-wide percentage raise is one typo away from an expensive, hard-to-manually-undo mistake. Dry-run lets the HR Manager confirm the diff first; the transaction guarantees no partial raise if something fails mid-batch.
Rules out: applying the increment row-by-row with partial commits.

## Server-side pagination, filtering, and aggregation
Decision: list/filter/search/dashboard-stats all happen in Postgres (via `django-filter`, DRF pagination, and DB `GROUP BY`), not by shipping all 10k rows to the client.
Why: at 10k+ employees, "fetch everything, filter/aggregate in the browser" doesn't scale and makes first paint slow.
Rules out: any client-side full-dataset filtering/sorting logic.

## No authentication layer
Decision: the API is unauthenticated within its deployed environment.
Why: covered in requirements.md's exclusions — one named persona, no IAM ask; the time budget goes to salary-domain correctness instead.
Rules out: role-based access, multi-user attribution beyond what's in the domain model.
