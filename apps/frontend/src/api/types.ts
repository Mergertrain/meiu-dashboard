export interface Project {
  id: number;
  title: string;
  sponsor_id: number;
  lead_id: number | null;
  status: string;
  priority: number;
  scope: string | null;
  start_date: string | null;
  target_date: string | null;
  updated_at: string;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  status: string;
  due_date: string | null;
  order_index: number;
}

export interface Task {
  id: number;
  project_id: number;
  milestone_id: number | null;
  assignee_id: number | null;
  title: string;
  status: string;
  points: number;
  updated_at: string;
}

export interface UpdateEntry {
  id: number;
  project_id: number;
  author_id: number;
  type: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  severity: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
