import { Router } from "express";
import { z } from "zod";
import { SseHub } from "../realtime/sse.js";
import { canReadProject } from "../services/rbac.js";
import { forbidden, badRequest } from "../utils/http.js";

export function createRealtimeRouter(hub: SseHub) {
  const router = Router();
  const schema = z.object({ projectId: z.coerce.number() });

  router.get("/sse", async (req, res) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return badRequest(res, "projectId is required");
    }

    if (!(await canReadProject(parsed.data.projectId, req.authUser!))) {
      return forbidden(res);
    }

    hub.attach(req, res, parsed.data.projectId);
  });

  return router;
}
