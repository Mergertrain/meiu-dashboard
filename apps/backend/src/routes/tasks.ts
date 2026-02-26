import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { createNotification, recordAndPublishEvent } from "../services/events.js";
import { canReadProject, canWriteTasks } from "../services/rbac.js";
import { badRequest, forbidden } from "../utils/http.js";

export const tasksRouter = Router();

const statusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

const createSchema = z.object({
  projectId: z.number(),
  milestoneId: z.number().nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: statusSchema.default("todo"),
  priority: prioritySchema.default("medium"),
  progressPct: z.number().int().min(0).max(100).default(0),
  blocker: z.string().nullable().optional(),
  createdBy: z.string().min(1).default("meiu"),
  points: z.number().int().min(0).default(0)
});

const patchSchema = z.object({
  milestoneId: z.number().nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  blocker: z.string().nullable().optional(),
  points: z.number().int().min(0).optional()
});

tasksRouter.get("/", async (req, res) => {
  const projectId = Number(req.query.project_id);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return badRequest(res, "project_id query parameter is required");
  }

  if (!(await canReadProject(projectId, req.authUser!))) {
    return forbidden(res);
  }

  const rows = await query(
    `SELECT id, project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points, updated_at, created_at
     FROM tasks
     WHERE project_id = $1
     ORDER BY updated_at DESC`,
    [projectId]
  );

  res.json(rows.rows);
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }
  const payload = parsed.data;

  if (!(await canWriteTasks(payload.projectId, req.authUser!))) {
    return forbidden(res);
  }

  const result = await query(
    `INSERT INTO tasks(project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      payload.projectId,
      payload.milestoneId ?? null,
      payload.assigneeId ?? null,
      payload.title,
      payload.description ?? null,
      payload.status,
      payload.priority,
      payload.progressPct,
      payload.blocker ?? null,
      payload.createdBy,
      payload.points
    ]
  );

  const task = result.rows[0] as { id: number; assignee_id: number | null; title: string };
  await recordAndPublishEvent({
    projectId: payload.projectId,
    actorId: req.authUser!.id,
    eventType: "task.created",
    entityType: "task",
    entityId: String(task.id),
    before: null,
    after: task
  });

  if (task.assignee_id) {
    await createNotification({
      userId: task.assignee_id,
      severity: "important",
      title: "Task assigned",
      body: `You were assigned task: ${task.title}`
    });
  }

  res.status(201).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const taskId = Number(req.params.id);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const existing = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
  const before = existing.rows[0] as { project_id: number; assignee_id: number | null; title: string } | undefined;
  if (!before) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (!(await canWriteTasks(before.project_id, req.authUser!))) {
    return forbidden(res);
  }

  const payload = parsed.data;
  const assignments: string[] = [];
  const params: unknown[] = [taskId];

  if ("milestoneId" in payload) {
    params.push(payload.milestoneId ?? null);
    assignments.push(`milestone_id = $${params.length}`);
  }
  if ("assigneeId" in payload) {
    params.push(payload.assigneeId ?? null);
    assignments.push(`assignee_id = $${params.length}`);
  }
  if ("title" in payload) {
    params.push(payload.title);
    assignments.push(`title = $${params.length}`);
  }
  if ("description" in payload) {
    params.push(payload.description ?? null);
    assignments.push(`description = $${params.length}`);
  }
  if ("status" in payload) {
    params.push(payload.status);
    assignments.push(`status = $${params.length}`);
  }
  if ("priority" in payload) {
    params.push(payload.priority);
    assignments.push(`priority = $${params.length}`);
  }
  if ("progressPct" in payload) {
    params.push(payload.progressPct);
    assignments.push(`progress_pct = $${params.length}`);
  }
  if ("blocker" in payload) {
    params.push(payload.blocker ?? null);
    assignments.push(`blocker = $${params.length}`);
  }
  if ("points" in payload) {
    params.push(payload.points);
    assignments.push(`points = $${params.length}`);
  }

  if (assignments.length === 0) {
    return badRequest(res, "No valid fields to update");
  }

  assignments.push("updated_at = NOW()");
  const result = await query(
    `UPDATE tasks
     SET ${assignments.join(", ")}
     WHERE id = $1
     RETURNING *`,
    params
  );

  const task = result.rows[0] as { id: number; status: string; assignee_id: number | null; title: string };
  await recordAndPublishEvent({
    projectId: before.project_id,
    actorId: req.authUser!.id,
    eventType: "task.updated",
    entityType: "task",
    entityId: String(task.id),
    before,
    after: task
  });

  if (task.status === "blocked") {
    const sponsors = await query<{ user_id: number }>(
      `SELECT user_id FROM project_members WHERE project_id = $1 AND access_level IN ('sponsor', 'project_lead')`,
      [before.project_id]
    );
    await Promise.all(
      sponsors.rows.map((s) =>
        createNotification({
          userId: s.user_id,
          severity: "critical",
          title: "Task blocked",
          body: `Task '${task.title}' is blocked.`
        })
      )
    );
  }

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return badRequest(res, "Invalid task id");
  }

  const existing = await query("SELECT id, project_id, title FROM tasks WHERE id = $1", [taskId]);
  const before = existing.rows[0] as { id: number; project_id: number; title: string } | undefined;
  if (!before) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (!(await canWriteTasks(before.project_id, req.authUser!))) {
    return forbidden(res);
  }

  await query("DELETE FROM tasks WHERE id = $1", [taskId]);

  await recordAndPublishEvent({
    projectId: before.project_id,
    actorId: req.authUser!.id,
    eventType: "task.deleted",
    entityType: "task",
    entityId: String(before.id),
    before,
    after: null
  });

  res.status(204).send();
});
