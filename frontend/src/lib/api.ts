/** Typed fetch wrapper for the same-origin /api route handlers. Cookies ride along automatically. */

// Empty (the consolidated app's default) = same-origin /api. An absolute value
// (legacy split-app deploys) still works and overrides the origin.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/** Resolves the request URL: relative to the browser origin when same-origin. */
function resolveUrl(path: string): URL {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // When API_BASE is absolute, `origin` is ignored; when empty, `/api…` resolves against origin.
  return new URL(`${API_BASE}/api${path}`, origin);
}

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
  const url = resolveUrl(path);
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

export type UploadedFile = {
  url: string;
  key: string | null;
  id: string | null;
  kind: "image" | "video" | "document";
  filename: string;
};

/** Uploads any supported file (image/video/pdf/word); returns its stored info. */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  return api<UploadedFile>("/admin/uploads", { method: "POST", body: form });
}

/** Uploads an image through the admin upload endpoint; returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  return (await uploadFile(file)).url;
}
