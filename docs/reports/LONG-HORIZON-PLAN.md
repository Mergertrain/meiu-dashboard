# Long-Horizon Execution Plan — meiu-dashboard (Autonomous)

_Last updated: 2026-02-25 UTC_
_Owner: MeiU_
_Objective: reach a stable, shareable demo URL and validate quality before asking Wei to review._

## North Star
Deliver a working demo URL where Wei can:
1) view projects,
2) open project detail/status board,
3) see live updates,
4) see notifications,
with acceptable reliability, security baseline, and UX clarity.

## Phase 0 — Operating Rules (always-on)
- Use Codex as primary implementation engine.
- Keep `main` green (CI must pass after each meaningful change).
- Prefer small iterative commits over large risky drops.
- Maintain executive updates in `docs/reports/CEO-UPDATE.md` after each milestone.
- Do not ask Wei to test until internal QA + customer-hat checks pass.

## Phase 1 — Stabilize Core Build (now)
1. Ensure reproducible local setup:
   - install, migrate, seed, run backend/frontend reliably.
2. Fix any runtime/type gaps missed by CI.
3. Add missing guards/error handling in API routes.
4. Tighten baseline docs (README quickstart + troubleshooting).

Exit criteria:
- CI consistently green.
- Local app can be started from clean checkout with documented steps.

## Phase 2 — Product-Complete MVP (functional)
1. Validate and complete core flows:
   - project list
   - project detail
   - task status movement
   - update feed
   - notifications read flow
2. Validate RBAC behavior for representative roles.
3. Improve data freshness and event reconciliation on frontend.
4. Add pragmatic UX polish:
   - loading/empty/error states
   - clearer labels/status chips
   - obvious “last updated” indicators.

Exit criteria:
- Core demo script can be completed without workaround.

## Phase 3 — Demo Deployment Track
1. Select deployment target (default path: Vercel frontend + Render/Fly/Railway backend + managed Postgres/Redis).
2. Add production env config and deployment manifests.
3. Provision hosted Postgres/Redis.
4. Deploy backend and frontend.
5. Wire CORS/auth headers and environment variables.
6. Smoke test on public URL.

Exit criteria:
- Public demo URL is reachable and functional.

## Phase 4 — Pre-CEO Internal QA (customer hat)
Before notifying Wei, run structured checks personally:

### A) Functional smoke
- Can load dashboard and navigate core pages.
- Can update a task and observe downstream UI refresh.
- Can create an update and see activity feed/notifications impact.

### B) Real-time behavior
- Two-tab test: updates in tab A should appear in tab B quickly.
- Recover from temporary disconnect/reload without stale state.

### C) UX quality
- New user clarity (can understand what to do in <1 min).
- No obvious dead-end actions.
- Messaging/errors are human-readable.

### D) Reliability/safety baseline
- No obvious 500s during core flows.
- No secrets exposed in UI or repo.
- Basic permission checks hold for non-privileged users.

If issues found:
- Fix + redeploy + re-run checks until pass.

Exit criteria:
- Internal quality gate passed; demo is safe to show.

## Phase 5 — CEO Review Handoff
When ready, send Wei:
1. demo URL,
2. 60-second walkthrough,
3. known limitations,
4. top 3 recommended next improvements.

## Daily Cadence (while Wei away)
- Continue autonomous Codex cycles.
- After every major progress step:
  - update `docs/reports/CEO-UPDATE.md`
  - keep branch synced and CI green.

## Completion Definition
“Ready for Wei review” means:
- URL deployed,
- core scenarios pass,
- quality checks complete,
- no known blocker for first demo.
