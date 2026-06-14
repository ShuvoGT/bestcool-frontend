/** HTML sanitization (ported from backend/src/utils/sanitize.ts). */
import sanitizeHtml from "sanitize-html";

/** For admin-authored rich text (product descriptions, CMS rich-text blocks). */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "p", "br", "hr", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "blockquote", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["style"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

/** For customer-generated content (reviews, notes) — strips ALL markup. */
export function sanitizePlainText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Walks any JSON value and sanitizes string fields: keys named "html" get the
 * rich-text policy, everything else is stripped to plain text.
 */
export function sanitizeBlockContent<T>(value: T, key?: string): T {
  if (typeof value === "string") {
    return (key === "html" ? sanitizeRichText(value) : sanitizePlainText(value)) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeBlockContent(v)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeBlockContent(v, k);
    return out as T;
  }
  return value;
}
