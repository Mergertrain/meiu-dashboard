import { Router } from "express";
import { z } from "zod";
import { query } from "../db/client.js";
import { canReadProject } from "../services/rbac.js";
import { forbidden, badRequest } from "../utils/http.js";

export const eventsRouter = Router();

const schema = z.object({
  projectId: z.coerce.number()
});

eventsRouter.get("/", async (req, res) => {
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return badRequest(res, "projectId is required");
  }

  if (!(await canReadProject(parsed.data.projectId, req.authUser!))) {
    return forbidden(res);
  }

  const result = await query(
    `SELECT id, project_id, actor_id, event_type, entity_type, entity_id, before_json, after_json, created_at
     FROM events WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [parsed.data.projectId]
  );
  res.json(result.rows);
});
