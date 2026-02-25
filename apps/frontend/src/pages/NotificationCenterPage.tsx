import { useEffect, useState } from "react";
import { apiGet, apiMarkRead } from "../api/client";
import { Notification } from "../api/types";

export function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function load() {
    const data = await apiGet<Notification[]>("/notifications");
    setNotifications(data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <section>
      <h2>Notification Center</h2>
      <div className="list">
        {notifications.map((n) => (
          <article key={n.id} className={`notice ${n.read_at ? "read" : "unread"}`}>
            <p>
              <strong>{n.severity.toUpperCase()}</strong> {n.title}
            </p>
            <p>{n.body}</p>
            <button
              disabled={Boolean(n.read_at)}
              onClick={async () => {
                await apiMarkRead(`/notifications/${n.id}/read`);
                await load();
              }}
            >
              {n.read_at ? "Read" : "Mark as read"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
