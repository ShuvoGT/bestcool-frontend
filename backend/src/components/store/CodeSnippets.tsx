"use client";

/**
 * Custom Code Snippets (admin feature, spec §13 adjacent).
 * Injects admin-authored HTML/JS snippets into the storefront <head> or the
 * end of <body> — e.g. analytics, site-verification meta tags, A/B tools,
 * chat widgets, custom CSS. Managed from Admin → Settings → Code Snippets;
 * changing a snippet needs no redeploy. Never runs on /admin (storefront only).
 *
 * Snippets are admin-only to set and are injected verbatim (that's the point),
 * so only trusted admins should use this — same trust model as a CMS.
 */
import { useEffect } from "react";

export type Snippet = { name?: string; placement?: "head" | "bodyEnd"; code?: string; enabled?: boolean };

/** Re-creates <script> tags so they actually execute when injected at runtime. */
function injectInto(target: HTMLElement, html: string): Node[] {
  const tpl = document.createElement("div");
  tpl.innerHTML = html;
  const inserted: Node[] = [];
  Array.from(tpl.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const old = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(old.attributes)) script.setAttribute(attr.name, attr.value);
      script.text = old.text;
      target.appendChild(script);
      inserted.push(script);
    } else {
      const clone = node.cloneNode(true);
      target.appendChild(clone);
      inserted.push(clone);
    }
  });
  return inserted;
}

export function CodeSnippets({ snippets }: { snippets: Snippet[] }) {
  useEffect(() => {
    const enabled = (snippets ?? []).filter((s) => s.enabled !== false && s.code?.trim());
    const inserted: Node[] = [];
    for (const s of enabled) {
      const target = s.placement === "head" ? document.head : document.body;
      inserted.push(...injectInto(target, s.code!));
    }
    return () => inserted.forEach((n) => n.parentNode?.removeChild(n));
  }, [snippets]);

  return null;
}
