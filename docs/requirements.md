# Requirements — Employee Salary Management

## Goal
Give ACME's HR Manager a web-based system to manage salary data for ~10,000 employees across multiple countries, replacing spreadsheets, and to answer questions about how the org pays people.

## Persona
HR Manager — single actor, org-wide visibility, no self-service employee/manager access in this scope.

## In scope
- **Employee records**: name, email, department, country, currency, base salary, employment status (active/terminated), hire/termination dates, manager (optional, self-referential)
- **CRUD**: create, view, edit, terminate employees; validation on all writes (non-negative salary, valid email/uniqueness, currency required with salary, termination date consistency)
- **Search & filter**: by name/email, department, country, currency, salary range, employment status; server-side, paginated for 10k-row scale
- **Salary audit trail**: every salary change recorded (old value, new value, effective date, reason) — append-only, never overwritten, so "how did we get here" is answerable
- **Bulk salary adjustment**: percentage increment scoped to a department or country, with a dry-run preview before committing (common real HR workflow — annual raises are rarely one employee at a time)
- **Pay analytics dashboard**: average/median/min/max salary by department and by country, **strictly segmented by currency** — never summed or averaged across currencies
- **CSV export** of the current filtered employee view
- **Seed data**: deterministic script generating 10,000 employees across ~10 countries/currencies and ~8 departments, including deliberately awkward rows (terminated staff, missing manager, extreme salary values) to prove the system handles them

## Deliberately out of scope (and why)
- **Authentication/authorization** — the assessment brief names one persona and doesn't ask for IAM; building real auth (sessions, roles, password reset) is a distinct problem from salary-domain correctness, and the time is better spent there. Single implicit HR-admin actor is assumed.
- **Multi-currency conversion/roll-up** — converting and summing salaries across currencies requires live FX rates and a defensible "as-of" date; doing it wrong (or with stale rates) actively misleads the HR Manager, which is worse than not doing it. Stats stay segmented by currency instead.
- **Payroll & tax computation** (gross-to-net, statutory deductions per country) — this is its own regulated domain per country; out of scope for a salary *record-keeping* tool.
- **Leave/attendance/performance management** — adjacent HR domains, not salary management.
- **Org chart / reporting-line visualization** — `manager` field exists for data completeness (and future use), but no chart UI is built.
- **Notifications/emailing** (e.g. "notify employee of raise") — no email infra assumed; out of scope for this exercise.
- **Multi-tenant/multi-org support** — single org (ACME) only.

## Success criteria
- HR Manager can find any employee or slice (e.g. "Engineering, India, active") in a few seconds even with 10k rows.
- Every salary change is traceable to who/when/why (audit trail).
- Dashboard numbers are never misleading (currency-segmented, so a "$50k average" claim is always in one currency).
- Bulk raise workflow prevents a fat-fingered percentage from silently wrecking payroll (dry-run first).
