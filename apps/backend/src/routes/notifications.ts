import { Router } from "express";
import { query } from "../db/client.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res) => {
  const result = await query(
    `SELECT id, user_id, channel, severity, title, body, read_at, created_at
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.authUser!.id]
  );
  res.json(result.rows);
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  const result = await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, read_at`,
    [id, req.authUser!.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: "Notification not found" });
  }

  res.json(result.rows[0]);
});
