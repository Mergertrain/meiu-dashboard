import { NextFunction, Request, Response } from "express";
import { query } from "../db/client.js";
import { AuthUser } from "../types/domain.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userIdRaw = req.header("x-user-id") ?? (req.query.userId as string | undefined);
  if (!userIdRaw) {
    res.status(401).json({ error: "Missing x-user-id header" });
    return;
  }

  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Invalid x-user-id" });
    return;
  }

  const userResult = await query<{ id: number; role: AuthUser["role"] }>(
    "SELECT id, role FROM users WHERE id = $1",
    [userId]
  );

  if (!userResult.rows[0]) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.authUser = userResult.rows[0];
  next();
}
