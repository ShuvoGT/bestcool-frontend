/** Typed fetch wrapper for the Express API. Cookies ride along automatically. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: string[]) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const url = new URL(`${API_BASE}/api${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const isForm = opts.body instanceof FormData;
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: opts.body && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: isForm ? (opts.body as FormData) : opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`, (data as { details?: string[] }).details);
  }
  return data as T;
}

/** Uploads an image through the admin upload endpoint; returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api<{ url: string }>("/admin/uploads", { method: "POST", body: form });
  return res.url;
}
