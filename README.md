# Employee Salary Management

Web-based salary management for an HR Manager at a 10,000-employee, multi-country org. Replaces spreadsheet-based salary tracking with a searchable, filterable system plus salary-by-department/country analytics.

## Stack
- **Server**: Python, Django + Django REST Framework, PostgreSQL
- **Client**: React + Vite + TypeScript, shadcn/ui, TanStack Table/Query, Recharts
- **Tests**: pytest (server), Vitest + React Testing Library (client)
- **Deploy**: Render (server + Postgres), Vercel (client)

## Repo layout
```
server/   Django project (API, models, seed command, tests)
client/   React app (UI)
docs/     requirements, architecture, trade-offs, demo notes
```

## Docs
- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)

## Local setup
_Filled in once server/client scaffolding lands._
