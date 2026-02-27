import { describe, expect, it } from "vitest";
import { canCreateProject, hasMinimumRole } from "../src/services/rbac.js";

describe("RBAC role matrix", () => {
  it("allows only sponsor/admin to create project", () => {
    expect(canCreateProject({ id: 1, role: "admin" })).toBe(true);
    expect(canCreateProject({ id: 2, role: "sponsor" })).toBe(true);
    expect(canCreateProject({ id: 3, role: "project_lead" })).toBe(false);
    expect(canCreateProject({ id: 4, role: "contributor" })).toBe(false);
    expect(canCreateProject({ id: 5, role: "viewer" })).toBe(false);
  });

  it("enforces project_lead threshold for protected write actions", () => {
    expect(hasMinimumRole("contributor", "project_lead")).toBe(false);
    expect(hasMinimumRole("project_lead", "project_lead")).toBe(true);
    expect(hasMinimumRole("sponsor", "project_lead")).toBe(true);
    expect(hasMinimumRole("viewer", "project_lead")).toBe(false);
  });
});
