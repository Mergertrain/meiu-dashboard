ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS progress_pct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocker TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'meiu';

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check CHECK (status::text IN ('todo', 'in_progress', 'blocked', 'done'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tasks
    ADD CONSTRAINT tasks_progress_pct_check CHECK (progress_pct BETWEEN 0 AND 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
