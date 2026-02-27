# MEIU Dashboard MVP

Production-quality MVP baseline for a real-time project execution dashboard.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (SQL migrations)
- Realtime: SSE with Redis pub/sub abstraction (in-memory fallback)
- Testing: Vitest

## Monorepo layout

- `apps/backend`: REST API, RBAC, migrations, seed, realtime fan-out
- `apps/frontend`: dashboard UI (project list/detail/activity/notifications)
- `docs/proposals/pe-pm-proposal.md`: source MVP proposal
- `docker-compose.yml`: local Postgres + Redis

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Start Postgres + Redis:

```bash
npm run db:up
```

3. Configure env files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

4. Run migrations and seed:

```bash
npm run migrate
npm run seed
```

5. Start backend + frontend:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/health`

## Useful commands

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run db:down`
- `npm run db:reset`

## Auth and RBAC model (MVP)

- Auth is request-scoped via `x-user-id` header (or `userId` query for SSE).
- Global roles: `admin`, `sponsor`, `project_lead`, `contributor`, `viewer`.
- Project visibility is scoped by `project_members` for non-admin/non-sponsor users.
- Write checks:
  - Project metadata + milestone management: project lead (or sponsor/admin)
  - Task mutation (`PATCH /tasks`) + update posting (`POST /updates`): project lead and above (or sponsor/admin)
  - Contributors/viewers: read-only for these protected write endpoints

## APIs implemented

- `GET /api/users`
- `GET/POST/PATCH /api/projects`
- `GET /api/projects/:id` (detail bundle: project + milestones + tasks + updates)
- `POST/PATCH /api/milestones`
- `POST/PATCH /api/tasks`
- `GET/POST /api/updates`
- `GET /api/events?projectId=<id>`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `GET /api/realtime/sse?projectId=<id>&userId=<id>`

## Realtime architecture

1. API mutation writes data to PostgreSQL.
2. Event is persisted in immutable `events` table.
3. Event publishes to bus:
   - Redis pub/sub when `REDIS_URL` is configured and reachable.
   - In-memory emitter fallback for local/dev resilience.
4. SSE hub broadcasts event to subscribers for that project.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. `npm ci`
2. migrations + seed against service Postgres
3. lint, test, build

## Testing coverage in MVP

- RBAC role behavior for critical permission thresholds.
- Realtime event propagation from bus to SSE subscribers.

## Notes

- Scope is intentionally MVP-pragmatic and optimized for local run reliability.
- Email notification delivery is stubbed to in-app notifications; critical path hooks are present in backend event handling.
