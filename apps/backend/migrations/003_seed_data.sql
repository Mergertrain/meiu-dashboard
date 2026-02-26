-- Seed initial users + meiu-dashboard project
-- Safe to run multiple times (ON CONFLICT DO NOTHING / DO UPDATE)

INSERT INTO users(name, email, role) VALUES
  ('Wei',    'wei@meiu.dev',    'sponsor'),
  ('Jiajie', 'jiajie@meiu.dev', 'sponsor'),
  ('MeiU',   'meiu@meiu.dev',   'project_lead')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

DO $$
DECLARE
  v_wei_id    BIGINT;
  v_jiajie_id BIGINT;
  v_meiu_id   BIGINT;
  v_pid       BIGINT;
  v_m1        BIGINT;
  v_m2        BIGINT;
  v_m3        BIGINT;
  v_m4        BIGINT;
BEGIN
  SELECT id INTO v_wei_id    FROM users WHERE email = 'wei@meiu.dev';
  SELECT id INTO v_jiajie_id FROM users WHERE email = 'jiajie@meiu.dev';
  SELECT id INTO v_meiu_id   FROM users WHERE email = 'meiu@meiu.dev';

  -- Skip if project already exists
  IF NOT EXISTS (SELECT 1 FROM projects WHERE title = 'meiu-dashboard') THEN

    INSERT INTO projects(title, sponsor_id, lead_id, status, priority, scope, start_date, target_date)
    VALUES ('meiu-dashboard', v_wei_id, v_meiu_id, 'active', 1,
      'Internal real-time project tracking dashboard for Wei + Jiajie',
      '2026-02-25', '2026-03-31')
    RETURNING id INTO v_pid;

    INSERT INTO project_members(project_id, user_id, access_level) VALUES
      (v_pid, v_wei_id,    'sponsor'),
      (v_pid, v_jiajie_id, 'sponsor'),
      (v_pid, v_meiu_id,   'project_lead')
    ON CONFLICT DO NOTHING;

    INSERT INTO milestones(project_id, title, status, due_date, order_index)
    VALUES
      (v_pid, 'MVP Scaffold',          'done',        '2026-02-25', 1),
      (v_pid, 'Task Tracking + Deploy','done',        '2026-02-26', 2),
      (v_pid, 'QA + Polish',           'in_progress', '2026-03-07', 3),
      (v_pid, 'Production Ready',      'todo',        '2026-03-31', 4)
    RETURNING id INTO v_m4;

    SELECT id INTO v_m1 FROM milestones WHERE project_id = v_pid AND title = 'MVP Scaffold';
    SELECT id INTO v_m2 FROM milestones WHERE project_id = v_pid AND title = 'Task Tracking + Deploy';
    SELECT id INTO v_m3 FROM milestones WHERE project_id = v_pid AND title = 'QA + Polish';
    SELECT id INTO v_m4 FROM milestones WHERE project_id = v_pid AND title = 'Production Ready';

    INSERT INTO tasks(project_id, milestone_id, assignee_id, title, description, status, priority, progress_pct, blocker, created_by, points) VALUES
      (v_pid, v_m1, v_meiu_id, 'Scaffold MVP backend + frontend',    'Express API, React, Postgres, Redis, CI',       'done',        'high',     100, NULL, 'meiu', 8),
      (v_pid, v_m1, v_meiu_id, 'Fix CI type errors',                 'Resolve TypeScript config and pg query typing', 'done',        'medium',   100, NULL, 'meiu', 2),
      (v_pid, v_m2, v_meiu_id, 'Add task tracking table + API',      'Tasks CRUD, project stats, progress %',         'done',        'high',     100, NULL, 'meiu', 5),
      (v_pid, v_m2, v_meiu_id, 'Deploy to Vercel + Railway',         'Frontend on Vercel, backend on Railway',        'done',        'critical', 100, NULL, 'meiu', 5),
      (v_pid, v_m2, v_meiu_id, 'Fix deployment issues',              'Node 20, dist path, CORS, env vars',            'done',        'critical', 100, NULL, 'meiu', 3),
      (v_pid, v_m3, v_meiu_id, 'Frontend-backend connection',        'Verify VITE_API_BASE + CORS end-to-end',        'in_progress', 'high',      50, NULL, 'meiu', 2),
      (v_pid, v_m3, v_meiu_id, 'Add authentication',                 'Real user auth instead of x-user-id header',   'todo',        'high',       0, NULL, 'meiu', 5),
      (v_pid, v_m3, v_meiu_id, 'Mobile responsive layout',           'Dashboard usable on phone screens',             'todo',        'medium',     0, NULL, 'meiu', 3),
      (v_pid, v_m4, v_meiu_id, 'Autonomous task creation via API',   'MeiU creates/updates tasks as it works',        'todo',        'high',       0, NULL, 'meiu', 5),
      (v_pid, v_m4, v_meiu_id, 'Long-horizon execution loop',        'Heartbeat + cron + GOALS.md progress',          'in_progress', 'high',      60, NULL, 'meiu', 3);

  END IF;
END $$;
