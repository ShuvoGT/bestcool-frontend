/** URL-safe slugs from names, e.g. "MacBook Air 13\" M4" → "macbook-air-13-m4". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
