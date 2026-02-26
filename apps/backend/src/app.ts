import cors from "cors";
import express from "express";
import { pool, query } from "./db/client.js";
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
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.corsOrigin.includes(origin)) return callback(null, true);
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    }
  }));
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      const [users, projects, tasks] = await Promise.all([
        query("SELECT count(*) as c FROM users"),
        query("SELECT count(*) as c FROM projects"),
        query("SELECT count(*) as c FROM tasks"),
      ]);
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

  // Temporary one-shot seed endpoint — remove after first use
  app.post("/admin/seed", async (_req, res) => {
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const users = await client.query(`
          INSERT INTO users(name, email, role) VALUES
            ('Wei', 'wei@meiu.dev', 'sponsor'),
            ('Jiajie', 'jiajie@meiu.dev', 'sponsor'),
            ('MeiU', 'meiu@meiu.dev', 'project_lead')
          ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
          RETURNING id, email`);
        const byEmail = new Map((users.rows as {id:number;email:string}[]).map(r => [r.email, r.id]));
        const meiuId = byEmail.get("meiu@meiu.dev");
        const weiId = byEmail.get("wei@meiu.dev");
        const jiajieId = byEmail.get("jiajie@meiu.dev");

        const proj = await client.query<{id:number}>(`
          INSERT INTO projects(title, sponsor_id, lead_id, status, priority, scope, start_date, target_date)
          VALUES ('meiu-dashboard', $1, $2, 'active', 1,
            'Internal real-time project tracking dashboard for Wei + Jiajie',
            '2026-02-25', '2026-03-31')
          RETURNING id`, [weiId, meiuId]);
        const pid = proj.rows[0].id;

        await client.query(`
          INSERT INTO project_members(project_id, user_id, access_level) VALUES
            ($1,$2,'sponsor'),($1,$3,'sponsor'),($1,$4,'project_lead')
          ON CONFLICT DO NOTHING`, [pid, weiId, jiajieId, meiuId]);

        const ms = await client.query<{id:number}>(`
          INSERT INTO milestones(project_id, title, status, due_date, order_index) VALUES
            ($1,'MVP Scaffold','done','2026-02-25',1),
            ($1,'Task Tracking + Deploy','done','2026-02-26',2),
            ($1,'QA + Polish','in_progress','2026-03-07',3),
            ($1,'Production Ready','todo','2026-03-31',4)
          RETURNING id`, [pid]);
        const [m1,m2,m3,m4] = ms.rows.map(r=>r.id);

        await client.query(`
          INSERT INTO tasks(project_id,milestone_id,assignee_id,title,description,status,priority,progress_pct,blocker,created_by,points) VALUES
            ($1,$2,$3,'Scaffold MVP backend + frontend','Express API, React, Postgres, Redis, CI','done','high',100,NULL,'meiu',8),
            ($1,$2,$3,'Fix CI type errors','Resolve TypeScript config and pg query typing','done','medium',100,NULL,'meiu',2),
            ($1,$4,$3,'Add task tracking table + API','Tasks CRUD, project stats, progress %','done','high',100,NULL,'meiu',5),
            ($1,$4,$3,'Deploy to Vercel + Railway','Frontend on Vercel, backend on Railway','done','critical',100,NULL,'meiu',5),
            ($1,$4,$3,'Fix deployment issues','Node 20, dist path, CORS, env vars','done','critical',100,NULL,'meiu',3),
            ($1,$5,$3,'Frontend-backend connection','Verify VITE_API_BASE + CORS end-to-end','in_progress','high',50,NULL,'meiu',2),
            ($1,$5,$3,'Add authentication','Real user auth instead of x-user-id header','todo','high',0,NULL,'meiu',5),
            ($1,$5,$3,'Mobile responsive layout','Dashboard usable on phone screens','todo','medium',0,NULL,'meiu',3),
            ($1,$6,$3,'Autonomous task creation via API','MeiU creates/updates tasks as it works','todo','high',0,NULL,'meiu',5),
            ($1,$6,$3,'Long-horizon execution loop','Heartbeat + cron + GOALS.md progress','in_progress','high',60,NULL,'meiu',3)`,
          [pid,m1,meiuId,m2,m3,m4]);

        await client.query("COMMIT");
        res.json({ ok: true, users: users.rows.length, project: pid, tasks: 10 });
      } catch(e) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: String(e) });
      } finally { client.release(); }
    } catch(e) { res.status(500).json({ error: String(e) }); }
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
