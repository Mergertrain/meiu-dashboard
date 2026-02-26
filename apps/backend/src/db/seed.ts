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
        ('Alicia Lead', 'lead@meiu.dev', 'project_lead'),
        ('Chris Contributor', 'contrib@meiu.dev', 'contributor'),
        ('Vera Viewer', 'viewer@meiu.dev', 'viewer')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email;
    `);

    const byEmail = new Map(users.rows.map((row: { id: number; email: string }) => [row.email, row.id]));

    const project = await client.query<{ id: number }>(`
      INSERT INTO projects(title, sponsor_id, lead_id, status, priority, scope, start_date, target_date)
      VALUES ('Realtime Delivery Dashboard', $1, $2, 'active', 1, 'MVP buildout', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '30 days')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [byEmail.get("wei@meiu.dev"), byEmail.get("lead@meiu.dev")]);

    let projectId = project.rows[0]?.id;
    if (!projectId) {
      const existing = await client.query<{ id: number }>("SELECT id FROM projects WHERE title = 'Realtime Delivery Dashboard' LIMIT 1");
      projectId = existing.rows[0].id;
    }

    await client.query(
      `INSERT INTO project_members(project_id, user_id, access_level)
       VALUES
        ($1, $2, 'sponsor'),
        ($1, $3, 'project_lead'),
        ($1, $4, 'contributor'),
        ($1, $5, 'viewer')
       ON CONFLICT (project_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
      [projectId, byEmail.get("wei@meiu.dev"), byEmail.get("lead@meiu.dev"), byEmail.get("contrib@meiu.dev"), byEmail.get("viewer@meiu.dev")]
    );

    const milestoneRows = await client.query<{ id: number }>(`
      INSERT INTO milestones(project_id, title, status, due_date, order_index)
      VALUES
        ($1, 'Platform foundation', 'done', CURRENT_DATE - INTERVAL '1 day', 1),
        ($1, 'Realtime and notifications', 'in_progress', CURRENT_DATE + INTERVAL '7 days', 2),
        ($1, 'MVP release readiness', 'todo', CURRENT_DATE + INTERVAL '21 days', 3)
      RETURNING id
    `, [projectId]);

    await client.query(
      `INSERT INTO tasks(project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points)
       VALUES
        ($1, $2, $3, 'Implement RBAC checks', 'Enforce project access before mutation endpoints', 'in_progress', 'high', 60, NULL, 'meiu', 5),
        ($1, $4, $3, 'Build SSE project channel', 'Deliver live events for task and update changes', 'todo', 'medium', 0, NULL, 'meiu', 3),
        ($1, $5, $6, 'Create frontend status board', 'Render task swimlanes and transitions in dashboard', 'todo', 'medium', 0, NULL, 'meiu', 5),
        ($1, $4, $6, 'Wire DB migration in CI', 'Automate schema migration on deployment pipeline', 'blocked', 'critical', 35, 'Waiting for DB migration review approval', 'meiu', 2),
        ($1, $5, $3, 'Add project card progress visuals', 'Show aggregate task completion per project card', 'done', 'high', 100, NULL, 'meiu', 2)`,
      [
        projectId,
        milestoneRows.rows[0].id,
        byEmail.get("contrib@meiu.dev"),
        milestoneRows.rows[1].id,
        milestoneRows.rows[2].id,
        byEmail.get("lead@meiu.dev")
      ]
    );

    await client.query(
      `INSERT INTO updates(project_id, author_id, type, payload_json)
       VALUES
        ($1, $2, 'status', '{"summary":"Project is on track for MVP"}'),
        ($1, $3, 'blocker', '{"summary":"Waiting for API contract signoff"}')`,
      [projectId, byEmail.get("lead@meiu.dev"), byEmail.get("contrib@meiu.dev")]
    );

    await client.query(
      `INSERT INTO notifications(user_id, channel, severity, title, body)
       VALUES
        ($1, 'in_app', 'critical', 'Blocker added', 'Waiting for API contract signoff'),
        ($2, 'in_app', 'important', 'Milestone updated', 'Realtime and notifications moved to in_progress')`,
      [byEmail.get("wei@meiu.dev"), byEmail.get("lead@meiu.dev")]
    );

    await client.query("COMMIT");
    console.log("Seed data inserted");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
