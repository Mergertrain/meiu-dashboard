import { query } from "../db/client.js";
import { eventBus } from "../realtime/eventBus.js";
import { DomainEvent } from "../types/domain.js";

export async function recordAndPublishEvent(input: Omit<DomainEvent, "createdAt">) {
  const createdAt = new Date().toISOString();
  await query(
    `INSERT INTO events(project_id, actor_id, event_type, entity_type, entity_id, before_json, after_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [input.projectId, input.actorId, input.eventType, input.entityType, input.entityId, input.before, input.after, createdAt]
  );

  const event: DomainEvent = {
    ...input,
    createdAt
  };

  await eventBus.publish(event);
}

export async function createNotification(params: {
  userId: number;
  severity: "critical" | "important" | "informational";
  title: string;
  body: string;
}) {
  await query(
    `INSERT INTO notifications(user_id, channel, severity, title, body)
     VALUES ($1, 'in_app', $2, $3, $4)`,
    [params.userId, params.severity, params.title, params.body]
  );
}
