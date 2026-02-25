import { AuthUser, GlobalRole } from "../types/domain.js";
import { query } from "../db/client.js";

const roleRank: Record<GlobalRole, number> = {
  viewer: 1,
  contributor: 2,
  project_lead: 3,
  sponsor: 4,
  admin: 5
};

export function hasMinimumRole(role: GlobalRole, minimum: GlobalRole) {
  return roleRank[role] >= roleRank[minimum];
}

export async function getProjectAccessLevel(projectId: number, userId: number): Promise<GlobalRole | null> {
  const result = await query<{ access_level: GlobalRole }>(
    "SELECT access_level FROM project_members WHERE project_id = $1 AND user_id = $2",
    [projectId, userId]
  );
  return result.rows[0]?.access_level ?? null;
}

function isPlatformPrivileged(role: GlobalRole) {
  return role === "admin" || role === "sponsor";
}

export async function canReadProject(projectId: number, user: AuthUser): Promise<boolean> {
  if (isPlatformPrivileged(user.role)) {
    return true;
  }
  return (await getProjectAccessLevel(projectId, user.id)) !== null;
}

export async function canWriteProjectMeta(projectId: number, user: AuthUser): Promise<boolean> {
  if (isPlatformPrivileged(user.role)) {
    return true;
  }
  const level = await getProjectAccessLevel(projectId, user.id);
  return level === "project_lead";
}

export async function canManageMilestones(projectId: number, user: AuthUser): Promise<boolean> {
  if (isPlatformPrivileged(user.role)) {
    return true;
  }
  const level = await getProjectAccessLevel(projectId, user.id);
  return level === "project_lead";
}

export async function canWriteTasks(projectId: number, user: AuthUser): Promise<boolean> {
  if (isPlatformPrivileged(user.role)) {
    return true;
  }
  const level = await getProjectAccessLevel(projectId, user.id);
  return level !== null && hasMinimumRole(level, "contributor");
}

export async function canPostUpdate(projectId: number, user: AuthUser): Promise<boolean> {
  return canWriteTasks(projectId, user);
}

export function canCreateProject(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "sponsor";
}

export function canReadUser(targetUserId: number, user: AuthUser): boolean {
  return user.role === "admin" || user.id === targetUserId;
}
