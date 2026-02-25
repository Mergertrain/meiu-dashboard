export type GlobalRole = "admin" | "sponsor" | "project_lead" | "contributor" | "viewer";
export type ProjectStatus = "planned" | "active" | "at_risk" | "blocked" | "completed" | "archived";
export type WorkStatus = "todo" | "in_progress" | "blocked" | "done";
export type UpdateType = "status" | "comment" | "blocker" | "assignment";

export interface AuthUser {
  id: number;
  role: GlobalRole;
}

export interface DomainEvent {
  projectId: number;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId: number | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}
