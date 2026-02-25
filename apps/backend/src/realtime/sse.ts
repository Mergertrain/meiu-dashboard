import { Request, Response } from "express";
import { EventBus } from "./eventBus.js";
import { DomainEvent } from "../types/domain.js";

export class SseHub {
  private projectClients = new Map<number, Set<Response>>();

  constructor(bus: EventBus) {
    bus.onEvent((event) => this.broadcast(event));
  }

  attach(req: Request, res: Response, projectId: number) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!this.projectClients.has(projectId)) {
      this.projectClients.set(projectId, new Set<Response>());
    }
    this.projectClients.get(projectId)?.add(res);

    res.write(`event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`);

    const keepAlive = setInterval(() => {
      res.write("event: ping\\ndata: {}\\n\\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      this.projectClients.get(projectId)?.delete(res);
      if (this.projectClients.get(projectId)?.size === 0) {
        this.projectClients.delete(projectId);
      }
    });
  }

  private broadcast(event: DomainEvent) {
    const clients = this.projectClients.get(event.projectId);
    if (!clients || clients.size === 0) {
      return;
    }

    const payload = `event: domain_event\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      client.write(payload);
    }
  }
}
