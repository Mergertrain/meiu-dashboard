import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { EventBus } from "../src/realtime/eventBus.js";
import { SseHub } from "../src/realtime/sse.js";

function createMockResponse() {
  const writes: string[] = [];
  return {
    writes,
    setHeader: () => undefined,
    flushHeaders: () => undefined,
    write: (chunk: string) => {
      writes.push(chunk);
    }
  };
}

describe("Realtime event propagation", () => {
  it("pushes published events to SSE subscribers of the same project", async () => {
    const bus = new EventBus();
    const hub = new SseHub(bus);

    const req = new EventEmitter();
    const res = createMockResponse();

    hub.attach(req as any, res as any, 7);

    await bus.publish({
      projectId: 7,
      eventType: "task.updated",
      entityType: "task",
      entityId: "42",
      actorId: 1,
      before: { status: "todo" },
      after: { status: "in_progress" },
      createdAt: new Date().toISOString()
    });

    const domainEventChunk = res.writes.find((entry) => entry.includes("event: domain_event"));
    expect(domainEventChunk).toBeDefined();
    expect(domainEventChunk).toContain("task.updated");

    req.emit("close");
  });
});
