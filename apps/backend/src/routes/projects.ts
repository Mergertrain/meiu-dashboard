import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { createNotification, recordAndPublishEvent } from "../services/events.js";
import { canCreateProject, canReadProject, canWriteProjectMeta } from "../services/rbac.js";
import { badRequest, forbidden } from "../utils/http.js";

export const projectsRouter = Router();

interface ProjectTaskStats {
  taskStats: {
    total: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
    progress_pct: number;
  };
  latestTask: {
    title: string;
    status: string;
    updatedAt: string;
  } | null;
  currentBlocker: string | null;
}

const defaultTaskStats: ProjectTaskStats = {
  taskStats: {
    total: 0,
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
    progress_pct: 0
  },
  latestTask: null,
  currentBlocker: null
};

async function loadTaskStats(projectIds: number[]) {
  if (projectIds.length === 0) {
    return new Map<number, ProjectTaskStats>();
  }

  const [aggregateRows, latestRows, blockerRows] = await Promise.all([
    query<{
      project_id: number;
      total: number;
      todo: number;
      in_progress: number;
      blocked: number;
      done: number;
      progress_pct: number;
    }>(
      `SELECT
         project_id,
         COUNT(*)::INT AS total,
         COUNT(*) FILTER (WHERE status = 'todo')::INT AS todo,
         COUNT(*) FILTER (WHERE status = 'in_progress')::INT AS in_progress,
         COUNT(*) FILTER (WHERE status = 'blocked')::INT AS blocked,
         COUNT(*) FILTER (WHERE status = 'done')::INT AS done,
         CASE
           WHEN COUNT(*) = 0 THEN 0
           ELSE ((COUNT(*) FILTER (WHERE status = 'done') * 100) / COUNT(*))::INT
         END AS progress_pct
       FROM tasks
       WHERE project_id = ANY($1::bigint[])
       GROUP BY project_id`,
      [projectIds]
    ),
    query<{ project_id: number; title: string; status: string; updated_at: string }>(
      `SELECT DISTINCT ON (project_id) project_id, title, status::text AS status, updated_at
       FROM tasks
       WHERE project_id = ANY($1::bigint[])
       ORDER BY project_id, updated_at DESC`,
      [projectIds]
    ),
    query<{ project_id: number; blocker: string }>(
      `SELECT DISTINCT ON (project_id) project_id, blocker
       FROM tasks
       WHERE project_id = ANY($1::bigint[])
         AND status = 'blocked'
         AND blocker IS NOT NULL
         AND length(trim(blocker)) > 0
       ORDER BY project_id, updated_at DESC`,
      [projectIds]
    )
  ]);

  const statsMap = new Map<number, ProjectTaskStats>();
  for (const id of projectIds) {
    statsMap.set(id, { ...defaultTaskStats, taskStats: { ...defaultTaskStats.taskStats } });
  }

  for (const row of aggregateRows.rows) {
    const current = statsMap.get(row.project_id);
    if (!current) {
      continue;
    }
    current.taskStats = {
      total: row.total,
      todo: row.todo,
      in_progress: row.in_progress,
      blocked: row.blocked,
      done: row.done,
      progress_pct: row.progress_pct
    };
  }

  for (const row of latestRows.rows) {
    const current = statsMap.get(row.project_id);
    if (!current) {
      continue;
    }
    current.latestTask = {
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at
    };
  }

  for (const row of blockerRows.rows) {
    const current = statsMap.get(row.project_id);
    if (!current) {
      continue;
    }
    current.currentBlocker = row.blocker;
  }

  return statsMap;
}

const createSchema = z.object({
  title: z.string().min(1),
  sponsorId: z.number(),
  leadId: z.number().nullable().optional(),
  status: z.enum(["planned", "active", "at_risk", "blocked", "completed", "archived"]).default("planned"),
  priority: z.number().int().min(1).max(5).default(3),
  scope: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional()
});

const updateSchema = createSchema.partial();

projectsRouter.get("/", async (req, res) => {
  const user = req.authUser!;

  let rows;
  if (user.role === "admin" || user.role === "sponsor") {
    rows = await query(
      `SELECT id, title, sponsor_id, lead_id, status, priority, scope, start_date, target_date, updated_at, archived_at
       FROM projects ORDER BY updated_at DESC`
    );
  } else {
    rows = await query(
      `SELECT p.id, p.title, p.sponsor_id, p.lead_id, p.status, p.priority, p.scope, p.start_date, p.target_date, p.updated_at, p.archived_at
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ORDER BY p.updated_at DESC`,
      [user.id]
    );
  }

  const projectIds = rows.rows.map((row: { id: number }) => row.id);
  const statsMap = await loadTaskStats(projectIds);
  res.json(rows.rows.map((row: { id: number }) => ({ ...row, stats: statsMap.get(row.id) ?? defaultTaskStats })));
});

projectsRouter.get("/:id", async (req, res) => {
  const projectId = Number(req.params.id);
  if (!(await canReadProject(projectId, req.authUser!))) {
    return forbidden(res);
  }

  const projectRows = await query(
    `SELECT id, title, sponsor_id, lead_id, status, priority, scope, start_date, target_date, updated_at, archived_at
     FROM projects WHERE id = $1`,
    [projectId]
  );
  const project = projectRows.rows[0];
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const [milestones, tasks, updates] = await Promise.all([
    query(
      `SELECT id, project_id, title, status, due_date, order_index, created_at
       FROM milestones WHERE project_id = $1 ORDER BY order_index ASC, due_date NULLS LAST`,
      [projectId]
    ),
    query(
      `SELECT id, project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points, updated_at, created_at
       FROM tasks WHERE project_id = $1 ORDER BY updated_at DESC`,
      [projectId]
    ),
    query(
      `SELECT id, project_id, author_id, type, payload_json, created_at
       FROM updates WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [projectId]
    )
  ]);

  res.json({
    project,
    stats: (await loadTaskStats([projectId])).get(projectId) ?? defaultTaskStats,
    milestones: milestones.rows,
    tasks: tasks.rows,
    updates: updates.rows
  });
});

projectsRouter.post("/", async (req, res) => {
  if (!canCreateProject(req.authUser!)) {
    return forbidden(res);
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const payload = parsed.data;
  const result = await query(
    `INSERT INTO projects(title, sponsor_id, lead_id, status, priority, scope, start_date, target_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, sponsor_id, lead_id, status, priority, scope, start_date, target_date, updated_at`,
    [
      payload.title,
      payload.sponsorId,
      payload.leadId ?? null,
      payload.status,
      payload.priority,
      payload.scope ?? null,
      payload.startDate ?? null,
      payload.targetDate ?? null
    ]
  );

  const project = result.rows[0] as { id: number; title: string; sponsor_id: number };
  await query(
    `INSERT INTO project_members(project_id, user_id, access_level) VALUES ($1, $2, 'sponsor')
     ON CONFLICT (project_id, user_id) DO NOTHING`,
    [project.id, project.sponsor_id]
  );

  if (payload.leadId) {
    await query(
      `INSERT INTO project_members(project_id, user_id, access_level) VALUES ($1, $2, 'project_lead')
       ON CONFLICT (project_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
      [project.id, payload.leadId]
    );
  }

  await recordAndPublishEvent({
    projectId: project.id,
    actorId: req.authUser!.id,
    eventType: "project.created",
    entityType: "project",
    entityId: String(project.id),
    before: null,
    after: project
  });

  res.status(201).json(project);
});

projectsRouter.patch("/:id", async (req, res) => {
  const projectId = Number(req.params.id);
  if (!(await canWriteProjectMeta(projectId, req.authUser!))) {
    return forbidden(res);
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const beforeResult = await query("SELECT * FROM projects WHERE id = $1", [projectId]);
  const before = beforeResult.rows[0];
  if (!before) {
    return res.status(404).json({ error: "Project not found" });
  }

  const payload = parsed.data;
  const result = await query(
    `UPDATE projects
     SET title = COALESCE($2, title),
         sponsor_id = COALESCE($3, sponsor_id),
         lead_id = COALESCE($4, lead_id),
         status = COALESCE($5, status),
         priority = COALESCE($6, priority),
         scope = COALESCE($7, scope),
         start_date = COALESCE($8, start_date),
         target_date = COALESCE($9, target_date),
         updated_at = NOW(),
         archived_at = CASE WHEN $5 = 'archived' THEN NOW() ELSE archived_at END
     WHERE id = $1
     RETURNING *`,
    [
      projectId,
      payload.title ?? null,
      payload.sponsorId ?? null,
      payload.leadId ?? null,
      payload.status ?? null,
      payload.priority ?? null,
      payload.scope ?? null,
      payload.startDate ?? null,
      payload.targetDate ?? null
    ]
  );

  const project = result.rows[0] as { sponsor_id: number; title: string };
  await recordAndPublishEvent({
    projectId,
    actorId: req.authUser!.id,
    eventType: "project.updated",
    entityType: "project",
    entityId: String(projectId),
    before,
    after: project
  });

  await createNotification({
    userId: project.sponsor_id,
    severity: "important",
    title: "Project updated",
    body: `Project ${project.title} was updated.`
  });

  res.json(project);
});
