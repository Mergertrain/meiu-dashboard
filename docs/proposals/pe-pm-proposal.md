# meiu-dashboard PE + PM Proposal

## 1) Product goals and non-goals
### Goals
- Provide a single real-time view of coding project progress initiated by Wei and Jiajie.
- Reduce status-latency: key project changes should appear in the dashboard within seconds.
- Improve delivery predictability with clear health signals (milestones, blockers, velocity).
- Support lightweight operational decisions (prioritization, escalation, reassignment).

### Non-goals
- Full replacement for source control, issue trackers, or CI/CD systems.
- Heavy project-planning suites (advanced budgeting, resource planning, procurement).
- Organization-wide HR/performance management workflows.

## 2) User roles and permissions
| Role | Typical users | Permissions |
|---|---|---|
| Admin | Platform owner / ops | Manage org settings, integrations, roles, data retention, audit exports |
| Sponsor | Wei, Jiajie | Create/archive projects, set priorities, view all projects, comment, approve milestones |
| Project Lead | Eng lead / PM per project | Edit project metadata, milestones, risks, assignees, status updates |
| Contributor | Engineers | Update task/project status, post blockers/notes, view assigned and shared projects |
| Viewer | Stakeholders | Read-only access to permitted projects and dashboards |

Permission model: role-based access control (RBAC) with project-level scoping. Principle: least privilege by default.

## 3) MVP feature list
- Project registry: create/edit/archive projects with owner, scope, target dates.
- Real-time status board: stage, percent complete, blockers, last update timestamp.
- Milestones and tasks: basic hierarchy with status transitions.
- Activity feed: chronological event stream (status changes, comments, assignments).
- Live presence indicators: who last updated and active viewers/editors.
- Basic notifications: in-app alerts + email digests for critical changes.
- Search/filter: by owner (Wei/Jiajie), status, risk, due date.
- Audit trail: immutable event log for key project actions.

## 4) Real-time architecture and data model
### Architecture (pragmatic MVP)
- Frontend: React dashboard with optimistic UI updates.
- API layer: REST for CRUD + WebSocket (or SSE) for live updates.
- Backend service: Node.js service handling auth, business rules, event fan-out.
- Data stores:
  - PostgreSQL for source of truth.
  - Redis pub/sub for low-latency fan-out and presence.
- Integrations (MVP-lite): webhook ingestion from GitHub/Jira/CI (optional per project).

### Core data model (minimal)
- `users(id, name, email, role, created_at)`
- `projects(id, title, sponsor_id, lead_id, status, priority, start_date, target_date, updated_at)`
- `milestones(id, project_id, title, status, due_date, order_index)`
- `tasks(id, project_id, milestone_id, assignee_id, title, status, points, updated_at)`
- `updates(id, project_id, author_id, type, payload_json, created_at)`
- `events(id, project_id, actor_id, event_type, entity_type, entity_id, before_json, after_json, created_at)`
- `notifications(id, user_id, channel, severity, title, body, read_at, created_at)`
- `project_members(project_id, user_id, access_level)`

## 5) Event/update pipeline
1. User or integration triggers a change (e.g., task moved to "In Progress").
2. API validates auth + permissions, writes transactional change to PostgreSQL.
3. Service emits normalized domain event to Redis (`project.updated`, `task.status_changed`, etc.).
4. Real-time gateway subscribes and broadcasts to project-specific channels.
5. Clients receive event, reconcile local state, and append feed entry.
6. Notification worker evaluates rules and enqueues alerts (in-app/email).
7. Event persisted in immutable `events` table for audit and replay.

Design guardrails:
- Idempotency keys for integration/webhook events.
- Monotonic event timestamps + sequence per project for ordering.
- Retry with dead-letter queue for failed downstream delivery.

## 6) Notification strategy
### Trigger levels
- Critical: project off-track, blocker added, milestone overdue.
- Important: status changes, assignment changes, deadline moved.
- Informational: comments, minor metadata edits.

### Channels
- In-app real-time notifications (default for all levels).
- Email digest (daily/weekly) for important + informational.
- Immediate email for critical events.

### Controls
- User-level preferences (channel, frequency, quiet hours).
- Project-level subscription defaults (sponsors auto-subscribed to critical).
- Deduplication window (e.g., collapse repeated status flaps within 10 minutes).

## 7) Privacy/security controls
- SSO/OAuth2 login with optional MFA for admins/sponsors.
- RBAC with project-level access checks on every read/write.
- Encrypt in transit (TLS) and at rest (DB + backup encryption).
- Append-only audit logs for sensitive actions (role changes, data export).
- Secret management via environment vault; no secrets in repo.
- Data retention policy (e.g., active + 12 months history, configurable).
- PII minimization: store only necessary user identity fields.

## 8) Phased roadmap (MVP, v1, v2)
### MVP (4-6 weeks)
- Core project/task/milestone entities.
- Real-time board + activity feed.
- RBAC roles + project membership.
- Basic in-app notifications + critical email.
- Lightweight GitHub/Jira webhook ingest (one-way updates).

### v1 (next 6-8 weeks)
- Custom dashboards and saved filters.
- SLA-style risk scoring (stale updates, overdue trend, blocker age).
- Digest notifications and preference center.
- Improved integration reliability (idempotency + replay UI).
- Operational analytics: cycle time, throughput, blocker resolution time.

### v2 (next 8-12 weeks)
- Predictive insights (delivery risk forecasting).
- Bi-directional integration actions (e.g., create issue from dashboard).
- Portfolio-level planning views and dependency mapping.
- Fine-grained policy controls and advanced audit/report exports.

## 9) Delivery risks + mitigations
- Risk: Event ordering/race conditions create inconsistent UI.
  - Mitigation: per-project sequence numbers, reconciliation endpoint, deterministic conflict resolution.
- Risk: Notification fatigue reduces trust.
  - Mitigation: severity tiers, deduping, user preferences, digest-first for low priority.
- Risk: Integration fragility (webhook schema drift, outages).
  - Mitigation: versioned adapters, idempotency keys, dead-letter + replay tooling, synthetic monitoring.
- Risk: Scope creep delays MVP.
  - Mitigation: strict MVP acceptance criteria, weekly cutline review, backlog freeze in final sprint.
- Risk: Access-control mistakes expose project data.
  - Mitigation: centralized authorization middleware, permission test matrix, audit sampling.

## MVP success metrics
- P95 end-to-end update latency: < 3 seconds.
- Weekly active users among intended core roles: > 80%.
- % projects updated at least once every 3 working days: > 90%.
- Notification action rate on critical alerts: > 60% within 24h.
