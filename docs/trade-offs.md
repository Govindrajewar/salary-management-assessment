# Trade-offs, performance notes, demo

## Demo
- Live app: https://client-gamma-three-46.vercel.app
- API: https://acme-salary-api-lxpc.onrender.com/api/
- Screen recording: [docs/media/demo.webm](media/demo.webm) - employee list/search, create + edit an employee (with salary-history audit trail), dashboard (currency-segmented chart + by-country tab), bulk-increment dry run.
- Free-tier Render web services spin down after ~15 min idle - the first request after a while can take 30-50s to wake up.

## Reference repo
A shortlisted peer submission (Django+DRF/SQLite backend, React+Mantine frontend) was used as a scope reference, not a copy: same problem, deliberately different stack (Postgres, shadcn/ui) and a few features past that baseline - append-only salary audit trail, bulk increment with dry-run + transactional rollback, optimistic concurrency, CSV export.

## Key trade-offs
- **No auth** - see [requirements.md](requirements.md) for the reasoning (single implicit HR-admin actor, out of scope per the assessment brief).
- **No FX conversion** - salary stats are always segmented by currency (never summed/averaged across them). Converting would need live, dated FX rates; doing it with stale rates is worse than not doing it.
- **SQLite locally, Postgres in prod** (`DATABASE_URL` env-switched via `dj-database-url`) - no local Postgres install required for development; the deployed environment is the real target and is fully Postgres.
- **Free-tier hosting constraints shaped two decisions**: Render's free plan has no one-off Jobs API, so the initial 10k-employee seed is folded into the build command, guarded to run only when the `Employee` table is empty (redeploys never reseed on top of real data). Render's free Postgres also expires after 30 days - fine for an assessment demo, would be swapped for a paid tier in real use.
- **Country/currency reference data is a small static list in the client** (`client/src/lib/constants.ts`), not a backend endpoint - it mirrors the seed script's fixed set of 10 countries and doesn't change, so a dedicated API round-trip isn't worth it.
- **Manager assignment has no UI** - `Employee.manager` exists in the data model and seed data (for realism / future use) but isn't editable through the form; a proper manager picker for 10k employees is really an org-chart feature, and that's explicitly out of scope (see requirements.md).
- **Delete confirmation is a native `window.confirm`**, not a custom dialog - one extra component for a single low-frequency, low-risk action wasn't worth the complexity.

## Two real bugs found via testing (kept here since they show the value of actually running the thing)
- **Seed data correlation bug**: `department = DEPARTMENTS[i % 8]` and `country = COUNTRIES[i % 10]` shared a loop counter; since `gcd(8, 10) = 2`, every department only ever paired with countries of the same index-parity (half of them). Invisible until the dashboard's by-department chart visibly showed 4 departments instead of 8 for a given currency. Fixed by drawing department and country independently (`random.choice`, still deterministic under the seeded RNG).
- **Locale-dependent number formatting**: `Intl.NumberFormat(undefined, ...)` silently follows the machine's OS locale. On the dev machine used here, `undefined` resolved to a locale that renders USD with Indian-style lakh/crore digit grouping (`$1,00,000` instead of `$100,000`) - correct-looking in isolation, inconsistent across environments, and would have shown different formatting to different HR Managers depending on their OS settings. Fixed by pinning `formatSalary` to a fixed `'en-US'` locale.

## Performance notes
- **Seed script**: `bulk_create` in 1,000-row batches (10k single-row inserts would be ~10k round trips); ~44s locally against SQLite for 10,000 rows + 10,000 audit rows.
- **List endpoint**: server-side pagination (25/page) and DB-level filtering (`django-filter`, indexed columns: department, country, employment_status, currency) - the client never fetches or filters all 10k rows itself.
- **Dashboard stats**: aggregated via DB `GROUP BY` for count/avg/min/max; median has no portable single-query aggregate across SQLite and Postgres, so it's computed in Python from the grouped rows - acceptable since this is a once-per-view dashboard call, not a hot path, and each currency/department/country bucket is a few hundred rows at most even at 10k employees.
- **Bulk increment**: dry-run computes and returns the full preview without touching the DB; the real commit is one transaction (`bulk_update` + `bulk_create` for the audit rows) so a mid-batch failure leaves zero employees changed, verified by a test that forces a failure partway through.
