# Data Model

## Entities

### Department
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| name | string, unique | ordered by name |

### Employee
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| name | string | |
| email | string, unique | |
| department | FK → Department, `PROTECT` | can't delete a department with employees |
| country | string(2) | ISO 3166-1 alpha-2 |
| currency | string(3) | ISO 4217 |
| base_salary | decimal(12,2) | `>= 0` (CheckConstraint) |
| employment_status | enum: active, terminated | default `active` |
| hire_date | date | |
| termination_date | date, nullable | `>= hire_date` when set (CheckConstraint) |
| manager | FK → Employee (self), `SET_NULL`, nullable | related_name `reports` |
| created_at | datetime, auto | |
| updated_at | datetime, auto_now | drives optimistic concurrency check |

Indexes: `department`, `country`, `employment_status`, `currency` — these are exactly the filter/group-by columns used by the list endpoint and dashboard stats at 10k-row scale.

`manager` uses `SET_NULL` rather than `CASCADE`/`PROTECT`: terminating or deleting a manager shouldn't cascade-delete their reports or block the operation — reports just lose their manager reference.

### SalaryChange
Append-only audit log — rows are never updated or deleted.

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| employee | FK → Employee, `CASCADE` | related_name `salary_history` |
| old_salary | decimal(12,2) | |
| new_salary | decimal(12,2) | `>= 0` |
| currency | string(3) | snapshot at time of change |
| effective_date | date | |
| reason | string | free text, e.g. "annual increment", "bulk +5% Engineering" |
| created_at | datetime, auto | |

Ordered `-effective_date, -created_at` (most recent first). `employee` uses `CASCADE`: if an employee record is ever hard-deleted, its own history goes with it — there's no orphaned-audit-row case to handle. Salary edits (including bulk increments) write exactly one row here rather than mutating `base_salary` and losing the prior value.

## Relationships
```
Department 1 ──── * Employee
Employee   1 ──── * Employee   (manager / reports, self-referential, optional)
Employee   1 ──── * SalaryChange
```

## Why not normalize currency into its own table
Country and currency are stored as plain codes (ISO 3166/4217) on Employee rather than FK'd to lookup tables. There's no per-currency behavior (no FX, no formatting rules beyond a fixed locale) that would justify the extra join — see [decisions.md](decisions.md).
