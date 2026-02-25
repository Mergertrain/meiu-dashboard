import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { recordAndPublishEvent } from "../services/events.js";
import { canManageMilestones } from "../services/rbac.js";
import { badRequest, forbidden } from "../utils/http.js";

export const milestonesRouter = Router();

interface MilestoneRow {
  id: number;
  project_id: number;
  title: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  order_index: number;
}

const schema = z.object({
  projectId: z.number(),
  title: z.string().min(1),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).default("todo"),
  dueDate: z.string().nullable().optional(),
  orderIndex: z.number().int().default(0)
});

const patchSchema = schema.partial();

milestonesRouter.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const data = parsed.data;
  if (!(await canManageMilestones(data.projectId, req.authUser!))) {
    return forbidden(res);
  }

  const result = await query<MilestoneRow>(
    `INSERT INTO milestones(project_id, title, status, due_date, order_index)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.projectId, data.title, data.status, data.dueDate ?? null, data.orderIndex]
  );

  const milestone = result.rows[0];
  await recordAndPublishEvent({
    projectId: data.projectId,
    actorId: req.authUser!.id,
    eventType: "milestone.created",
    entityType: "milestone",
    entityId: String(milestone.id),
    before: null,
    after: milestone
  });

  res.status(201).json(milestone);
});

milestonesRouter.patch("/:id", async (req, res) => {
  const milestoneId = Number(req.params.id);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const existing = await query<MilestoneRow>("SELECT * FROM milestones WHERE id = $1", [milestoneId]);
  const before = existing.rows[0];
  if (!before) {
    return res.status(404).json({ error: "Milestone not found" });
  }

  if (!(await canManageMilestones(before.project_id, req.authUser!))) {
    return forbidden(res);
  }

  const data = parsed.data;
  const result = await query<MilestoneRow>(
    `UPDATE milestones
     SET title = COALESCE($2, title),
         status = COALESCE($3, status),
         due_date = COALESCE($4, due_date),
         order_index = COALESCE($5, order_index)
     WHERE id = $1
     RETURNING *`,
    [milestoneId, data.title ?? null, data.status ?? null, data.dueDate ?? null, data.orderIndex ?? null]
  );

  const milestone = result.rows[0];
  await recordAndPublishEvent({
    projectId: before.project_id,
    actorId: req.authUser!.id,
    eventType: "milestone.updated",
    entityType: "milestone",
    entityId: String(milestoneId),
    before,
    after: milestone
  });

  res.json(milestone);
});
