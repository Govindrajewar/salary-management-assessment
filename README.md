# Employee Salary Management

Web-based salary management for an HR Manager at a 10,000-employee, multi-country org. Replaces spreadsheet-based salary tracking with a searchable, filterable system plus salary-by-department/country analytics.

**Live demo**: https://client-gamma-three-46.vercel.app
**API**: https://acme-salary-api-lxpc.onrender.com/api/

## Stack
- **Server**: Python, Django + Django REST Framework, PostgreSQL
- **Client**: React + Vite + TypeScript, shadcn/ui, TanStack Table/Query, Recharts
- **Tests**: pytest (server, 47 tests), Vitest + React Testing Library (client, 24 tests)
- **Deploy**: Render (API + Postgres), Vercel (client)

## Repo layout
```
server/   Django project (API, models, seed command, tests)
client/   React app (UI)
docs/     requirements, architecture, trade-offs, demo notes
```

## Docs
- [Requirements](docs/requirements.md) - scope, and what's deliberately left out
- [Architecture](docs/architecture.md) - data model, API surface, key design decisions
- [Trade-offs & demo notes](docs/trade-offs.md)

## Local setup

### Server
```bash
cd server
python -m venv venv
venv/Scripts/activate      # venv\Scripts\activate on native Windows shells
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_employees      # seeds 10,000 employees, ~1 min
python manage.py runserver 8000
```
Runs on SQLite by default - no local Postgres install needed. Set `DATABASE_URL` (see `server/.env.example`) to point at Postgres instead.

### Client
```bash
cd client
npm install
npm run dev      # http://localhost:5173, expects the API at http://127.0.0.1:8000/api
```

### Tests
```bash
cd server && pytest
cd client && npm test
```
