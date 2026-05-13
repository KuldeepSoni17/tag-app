/** API base URL — set `EXPO_PUBLIC_API_URL` in `.env` for device testing (LAN IP of your machine). */
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

export async function api<T = unknown>(
  path: string,
  opts?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(opts?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts?.token) {
    headers.set("Authorization", `Bearer ${opts.token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = typeof body === "object" && body && "error" in body ? (body as { error: string }).error : text;
    throw new Error(String(err || res.statusText));
  }
  return body as T;
}
