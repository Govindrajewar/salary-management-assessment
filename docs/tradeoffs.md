# Trade-offs

Things deliberately left simple, and what that costs.

| Choice | What we gain | What it costs | Acceptable because |
|---|---|---|---|
| No auth | No session/role/password-reset code to build or secure | API is open to anyone who can reach the deployed URL | Single-persona assessment scope, not a real multi-tenant product (requirements.md) |
| No FX conversion | Stats are never misleadingly wrong across currencies | Can't answer "total payroll cost in USD" | A wrong FX-derived number is worse than no number (requirements.md) |
| Currency/country as plain codes, not FK'd tables | One fewer join everywhere; simpler schema | No DB-level guarantee a code is a real currency/country beyond field validation | No per-currency behavior exists yet to justify the table (decisions.md) |
| Optimistic concurrency (409 on conflict), not pessimistic locking | No lock/timeout state to manage | Client must handle the 409 (re-fetch, re-apply) instead of the server queuing writes | Single HR-Manager persona; conflicts are rare, and surfacing them beats silently dropping a write |
| Synthetic/deterministic seed data | Reproducible demo/test dataset, awkward cases (terminated, no manager, extreme salaries) guaranteed present | Doesn't exercise real-world data messiness (typos, duplicate near-matches, historical schema drift) | Real employee data isn't available or appropriate for an assessment |
| SQLite for local dev, Postgres in prod | Zero local setup | Any Postgres-only behavior (real CheckConstraint enforcement, concurrent-write semantics) isn't exercised locally | Constraints are still declared at the ORM level and tested against; the two backends agree closely enough for Django's supported feature set |
| CSV export streamed, not materialized upfront | Bounded memory even as the filtered result set grows | Slightly more code than `csv.writer` over a plain queryset | Necessary once export applies to the full 10k-row table rather than a small view |
| Bulk increment scoped to one department or one country per call | Simple request shape, one un-ambiguous scope per call | Can't raise "Engineering in India only" in a single call — needs a combined filter to be added if that becomes a real need | Matches the actual workflow described in requirements.md (dept-wide or country-wide raises) |
| Fixed display locale for salary formatting (not the runtime's OS locale) | Deterministic, testable formatting across machines/CI | Doesn't auto-adapt to a viewer's own locale preferences | This is an internal HR tool, not a public multi-locale product |

See also: [decisions.md](decisions.md) for the reasoning behind each choice, and [requirements.md](requirements.md) for what's out of scope entirely (not merely simplified).
