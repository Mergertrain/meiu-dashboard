import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { createNotification, recordAndPublishEvent } from "../services/events.js";
import { canWriteTasks } from "../services/rbac.js";
import { badRequest, forbidden } from "../utils/http.js";

export const tasksRouter = Router();

const createSchema = z.object({
  projectId: z.number(),
  milestoneId: z.number().nullable().optional(),
  assigneeId: z.number().nullable().optional(),
  title: z.string().min(1),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).default("todo"),
  points: z.number().int().min(0).default(0)
});

const patchSchema = createSchema.partial();

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
    `INSERT INTO tasks(project_id, milestone_id, assignee_id, title, status, points)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [payload.projectId, payload.milestoneId ?? null, payload.assigneeId ?? null, payload.title, payload.status, payload.points]
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
  const result = await query(
    `UPDATE tasks
     SET milestone_id = COALESCE($2, milestone_id),
         assignee_id = COALESCE($3, assignee_id),
         title = COALESCE($4, title),
         status = COALESCE($5, status),
         points = COALESCE($6, points),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      taskId,
      payload.milestoneId ?? null,
      payload.assigneeId ?? null,
      payload.title ?? null,
      payload.status ?? null,
      payload.points ?? null
    ]
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
