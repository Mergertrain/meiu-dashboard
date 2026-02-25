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

  it("enforces contributor threshold for write actions", () => {
    expect(hasMinimumRole("contributor", "contributor")).toBe(true);
    expect(hasMinimumRole("project_lead", "contributor")).toBe(true);
    expect(hasMinimumRole("sponsor", "contributor")).toBe(true);
    expect(hasMinimumRole("viewer", "contributor")).toBe(false);
  });
});
