/**
 * Tiny in-memory TTL cache so repeated analytics queries for the same date-range
 * key (e.g. a dashboard refresh) don't re-hit the DB. ~60s, per the spec.
 * Process-local — fine for a single Node worker (Hostinger/Passenger).
 */
type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();
const TTL_MS = 60_000;

export async function cached<T>(key: string, fn: () => Promise<T>, ttl = TTL_MS): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttl });
  // Opportunistic cleanup to bound memory.
  if (store.size > 200) {
    for (const [k, v] of store) if (v.expires <= now) store.delete(k);
  }
  return value;
}
