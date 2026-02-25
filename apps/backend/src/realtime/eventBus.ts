import { EventEmitter } from "node:events";
import { createClient, RedisClientType } from "redis";
import { env } from "../config/env.js";
import { DomainEvent } from "../types/domain.js";

const CHANNEL = "meiu:events";

type EventHandler = (event: DomainEvent) => void;

export class EventBus {
  private emitter = new EventEmitter();
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private redisEnabled = false;

  async init() {
    if (!env.redisUrl) {
      return;
    }

    try {
      this.publisher = createClient({ url: env.redisUrl });
      this.subscriber = createClient({ url: env.redisUrl });
      await this.publisher.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(CHANNEL, (message) => {
        this.emitter.emit("domain_event", JSON.parse(message) as DomainEvent);
      });
      this.redisEnabled = true;
      console.log("Redis pub/sub enabled");
    } catch (error) {
      this.redisEnabled = false;
      console.warn("Redis unavailable, using in-memory event bus", error);
      if (this.publisher) await this.publisher.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      this.publisher = null;
      this.subscriber = null;
    }
  }

  async publish(event: DomainEvent) {
    if (this.redisEnabled && this.publisher) {
      await this.publisher.publish(CHANNEL, JSON.stringify(event));
      return;
    }
    this.emitter.emit("domain_event", event);
  }

  onEvent(handler: EventHandler) {
    this.emitter.on("domain_event", handler);
    return () => this.emitter.off("domain_event", handler);
  }
}

export const eventBus = new EventBus();
