import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { SseHub } from "./realtime/sse.js";
import { eventBus } from "./realtime/eventBus.js";
import { eventsRouter } from "./routes/events.js";
import { milestonesRouter } from "./routes/milestones.js";
import { notificationsRouter } from "./routes/notifications.js";
import { projectsRouter } from "./routes/projects.js";
import { createRealtimeRouter } from "./routes/realtime.js";
import { tasksRouter } from "./routes/tasks.js";
import { updatesRouter } from "./routes/updates.js";
import { usersRouter } from "./routes/users.js";

export async function createApp() {
  await eventBus.init();
  const sseHub = new SseHub(eventBus);

  const app = express();
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(requireAuth);
  app.use("/api/users", usersRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/milestones", milestonesRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/updates", updatesRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/realtime", createRealtimeRouter(sseHub));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
