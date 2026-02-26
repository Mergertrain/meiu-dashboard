import { pool } from "./client.js";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const users = await client.query(`
      INSERT INTO users(name, email, role)
      VALUES
        ('Platform Admin', 'admin@meiu.dev', 'admin'),
        ('Wei', 'wei@meiu.dev', 'sponsor'),
        ('Jiajie', 'jiajie@meiu.dev', 'sponsor'),
        ('MeiU', 'meiu@meiu.dev', 'project_lead')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email;
    `);

    const byEmail = new Map(users.rows.map((row: { id: number; email: string }) => [row.email, row.id]));

    const project = await client.query<{ id: number }>(`
      INSERT INTO projects(title, sponsor_id, lead_id, status, priority, scope, start_date, target_date)
      VALUES ('meiu-dashboard', $1, $2, 'active', 1,
        'Internal real-time project tracking dashboard for Wei + Jiajie. Task management, progress cards, live updates.',
        '2026-02-25', '2026-03-31')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [byEmail.get("wei@meiu.dev"), byEmail.get("meiu@meiu.dev")]);

    let projectId = project.rows[0]?.id;
    if (!projectId) {
      const existing = await client.query<{ id: number }>("SELECT id FROM projects WHERE title = 'meiu-dashboard' LIMIT 1");
      projectId = existing.rows[0]?.id;
    }

    if (projectId) {
      await client.query(
        `INSERT INTO project_members(project_id, user_id, access_level)
         VALUES
          ($1, $2, 'sponsor'),
          ($1, $3, 'sponsor'),
          ($1, $4, 'project_lead')
         ON CONFLICT (project_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
        [projectId, byEmail.get("wei@meiu.dev"), byEmail.get("jiajie@meiu.dev"), byEmail.get("meiu@meiu.dev")]
      );

      const milestoneRows = await client.query<{ id: number }>(`
        INSERT INTO milestones(project_id, title, status, due_date, order_index)
        VALUES
          ($1, 'MVP Scaffold', 'done', '2026-02-25', 1),
          ($1, 'Task Tracking + Deploy', 'done', '2026-02-26', 2),
          ($1, 'QA + Polish', 'in_progress', '2026-03-07', 3),
          ($1, 'Production Ready', 'todo', '2026-03-31', 4)
        RETURNING id
      `, [projectId]);

      const meiuId = byEmail.get("meiu@meiu.dev");
      const m1 = milestoneRows.rows[0].id;
      const m2 = milestoneRows.rows[1].id;
      const m3 = milestoneRows.rows[2].id;
      const m4 = milestoneRows.rows[3].id;

      await client.query(
        `INSERT INTO tasks(project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points)
         VALUES
          ($1, $2, $3, 'Scaffold MVP backend + frontend', 'Express API, React frontend, Postgres, Redis, CI', 'done', 'high', 100, NULL, 'meiu', 8),
          ($1, $2, $3, 'Fix CI type errors', 'Resolve TypeScript config and pg query typing', 'done', 'medium', 100, NULL, 'meiu', 2),
          ($1, $4, $3, 'Add task tracking table + API', 'Tasks CRUD, project stats, progress percentage', 'done', 'high', 100, NULL, 'meiu', 5),
          ($1, $4, $3, 'Deploy to Vercel + Railway', 'Frontend on Vercel, backend on Railway with Postgres + Redis', 'done', 'critical', 100, NULL, 'meiu', 5),
          ($1, $4, $3, 'Fix deployment issues', 'Node version, TypeScript dist path, CORS, env vars', 'done', 'critical', 100, NULL, 'meiu', 3),
          ($1, $5, $3, 'Frontend-backend connection verification', 'Verify VITE_API_BASE + CORS working end-to-end', 'in_progress', 'high', 50, NULL, 'meiu', 2),
          ($1, $5, $3, 'Add authentication', 'Real user auth instead of x-user-id header', 'todo', 'high', 0, NULL, 'meiu', 5),
          ($1, $5, $3, 'Mobile responsive layout', 'Dashboard usable on phone screens', 'todo', 'medium', 0, NULL, 'meiu', 3),
          ($1, $6, $3, 'Autonomous task creation via API', 'MeiU creates/updates tasks as it works on GitHub', 'todo', 'high', 0, NULL, 'meiu', 5),
          ($1, $6, $3, 'Long-horizon execution loop', 'Heartbeat + cron + GOALS.md driving continuous progress', 'in_progress', 'high', 60, NULL, 'meiu', 3)`,
        [projectId, m1, meiuId, m2, m3, m4]
      );

      await client.query(
        `INSERT INTO updates(project_id, author_id, type, payload_json)
         VALUES
          ($1, $2, 'status', '{"summary":"MVP scaffolded and pushed to GitHub"}'),
          ($1, $2, 'status', '{"summary":"Task tracking system added, deployed to Vercel + Railway"}')`,
        [projectId, byEmail.get("meiu@meiu.dev")]
      );
    }

    await client.query("COMMIT");
    console.log("Seed data inserted");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
