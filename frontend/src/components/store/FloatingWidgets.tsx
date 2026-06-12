"use client";

/** WhatsApp floating button (hidden when no number) + optional live-chat embed. */
import { useEffect } from "react";

export function WhatsAppButton({ number, message }: { number: string | null; message?: string | null }) {
  if (!number) return null;
  const clean = number.replace(/[^0-9]/g, "");
  const href = `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-green-500/30 transition-transform hover:scale-110"
    >
      {/* Official WhatsApp glyph */}
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden>
        <path d="M16.04 4C9.42 4 4.05 9.36 4.05 15.98c0 2.11.55 4.17 1.6 5.99L4 28l6.18-1.62a11.96 11.96 0 0 0 5.86 1.49h.01c6.62 0 11.99-5.36 11.99-11.98A11.93 11.93 0 0 0 16.04 4Zm0 21.85h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.21-3.67.96.98-3.58-.24-.37a9.88 9.88 0 0 1-1.52-5.28c0-5.49 4.47-9.96 9.97-9.96a9.9 9.9 0 0 1 9.96 9.97c0 5.49-4.47 9.86-9.96 9.86Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}

/** Injects an arbitrary chat-widget script (Tawk.to / Crisp) from Settings. */
export function ChatEmbed({ code }: { code: string | null }) {
  useEffect(() => {
    if (!code?.trim()) return;
    const container = document.createElement("div");
    container.innerHTML = code;
    const inserted: Node[] = [];
    container.querySelectorAll("script").forEach((old) => {
      const script = document.createElement("script");
      for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
      script.text = old.text;
      document.body.appendChild(script);
      inserted.push(script);
    });
    return () => inserted.forEach((n) => n.parentNode?.removeChild(n));
  }, [code]);
  return null;
}
