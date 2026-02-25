import { Router } from "express";
import { query } from "../db/client.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res) => {
  const result = await query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(result.rows);
});
