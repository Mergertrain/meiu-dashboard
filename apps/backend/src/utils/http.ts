import { Response } from "express";

export function forbidden(res: Response, message = "Forbidden") {
  res.status(403).json({ error: message });
}

export function badRequest(res: Response, message: string) {
  res.status(400).json({ error: message });
}
