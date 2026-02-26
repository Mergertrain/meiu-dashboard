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

  app.get("/health", async (_req, res) => {
    try {
      const users = await import("./db/client.js").then(m => m.query("SELECT count(*) as c FROM users"));
      const projects = await import("./db/client.js").then(m => m.query("SELECT count(*) as c FROM projects"));
      const tasks = await import("./db/client.js").then(m => m.query("SELECT count(*) as c FROM tasks"));
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
        db: { users: users.rows[0].c, projects: projects.rows[0].c, tasks: tasks.rows[0].c }
      });
    } catch (e) {
      res.json({ status: "ok", timestamp: new Date().toISOString(), version: "0.1.0", dbError: String(e) });
    }
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
