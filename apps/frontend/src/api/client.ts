const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
const DEFAULT_USER_ID = import.meta.env.VITE_USER_ID ?? "8";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-user-id": localStorage.getItem("meiu_user_id") ?? DEFAULT_USER_ID
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<T>;
}

export async function apiMarkRead(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers()
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export function sseUrl(projectId: number): string {
  const base = import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api";
  const userId = localStorage.getItem("meiu_user_id") ?? DEFAULT_USER_ID;
  return `${base}/realtime/sse?projectId=${projectId}&userId=${userId}`;
}
