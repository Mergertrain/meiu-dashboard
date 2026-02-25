import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { createNotification, recordAndPublishEvent } from "../services/events.js";
import { canPostUpdate, canReadProject } from "../services/rbac.js";
import { badRequest, forbidden } from "../utils/http.js";

export const updatesRouter = Router();

const createSchema = z.object({
  projectId: z.number(),
  type: z.enum(["status", "comment", "blocker", "assignment"]),
  payload: z.record(z.any())
});

updatesRouter.get("/", async (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!projectId) {
    return badRequest(res, "projectId is required");
  }

  if (!(await canReadProject(projectId, req.authUser!))) {
    return forbidden(res);
  }

  const result = await query(
    `SELECT id, project_id, author_id, type, payload_json, created_at
     FROM updates WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [projectId]
  );

  res.json(result.rows);
});

updatesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, parsed.error.message);
  }

  const payload = parsed.data;
  if (!(await canPostUpdate(payload.projectId, req.authUser!))) {
    return forbidden(res);
  }

  const result = await query(
    `INSERT INTO updates(project_id, author_id, type, payload_json)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.projectId, req.authUser!.id, payload.type, JSON.stringify(payload.payload)]
  );

  const update = result.rows[0] as { id: number; type: string };

  await recordAndPublishEvent({
    projectId: payload.projectId,
    actorId: req.authUser!.id,
    eventType: "update.created",
    entityType: "update",
    entityId: String(update.id),
    before: null,
    after: update
  });

  if (payload.type === "blocker") {
    const subscribers = await query<{ user_id: number }>(
      `SELECT user_id FROM project_members WHERE project_id = $1 AND access_level IN ('sponsor', 'project_lead')`,
      [payload.projectId]
    );

    await Promise.all(
      subscribers.rows.map((s) =>
        createNotification({
          userId: s.user_id,
          severity: "critical",
          title: "Project blocker",
          body: "A blocker update was posted."
        })
      )
    );
  }

  res.status(201).json(update);
});
