"use client";

/**
 * WordPress "classic editor"-style rich text field: a contentEditable area with
 * a formatting toolbar (bold/italic/headings/lists/links). Reads and writes an
 * HTML string, so it's a drop-in replacement for the plain HTML <textarea>s used
 * for product descriptions and page content blocks.
 *
 * Built on the browser's editing engine (no extra dependencies). Output is plain
 * HTML tags; unsafe tags are still stripped server-side on save.
 */
import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, Pilcrow,
  List, ListOrdered, Link2, Unlink, RemoveFormatting, Undo, Redo,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  hint?: string;
  minHeight?: number;
  placeholder?: string;
};

export function RichTextField({ label, value, onChange, hint, minHeight = 200, placeholder = "Write here…" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Push external value changes into the editor only when it's NOT focused, so
  // the caret never jumps while typing. Handles async-loaded content too.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value]);

  function sync() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "false"); // prefer <b>/<i> over inline styles
    } catch {
      /* ignore */
    }
    document.execCommand(cmd, false, arg);
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL (e.g. https://example.com)");
    if (url) exec("createLink", url.trim());
  }

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-zinc-300">{label}</Label>}
      <div className="overflow-hidden rounded-md border border-white/10 bg-white/5 focus-within:border-cyan-400/50">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-white/[0.03] p-1">
          <ToolBtn title="Bold" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Italic" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Underline" onClick={() => exec("underline")}><Underline className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></ToolBtn>
          <Divider />
          <ToolBtn title="Heading 2" onClick={() => exec("formatBlock", "H2")}><Heading2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Heading 3" onClick={() => exec("formatBlock", "H3")}><Heading3 className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Paragraph" onClick={() => exec("formatBlock", "P")}><Pilcrow className="h-4 w-4" /></ToolBtn>
          <Divider />
          <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolBtn>
          <Divider />
          <ToolBtn title="Insert link" onClick={addLink}><Link2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Remove link" onClick={() => exec("unlink")}><Unlink className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Clear formatting" onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></ToolBtn>
          <Divider />
          <ToolBtn title="Undo" onClick={() => exec("undo")}><Undo className="h-4 w-4" /></ToolBtn>
          <ToolBtn title="Redo" onClick={() => exec("redo")}><Redo className="h-4 w-4" /></ToolBtn>
        </div>

        {/* Editable area */}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          data-placeholder={placeholder}
          onInput={sync}
          onBlur={sync}
          style={{ minHeight }}
          className={cn(
            "max-w-none overflow-y-auto px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none",
            // Placeholder when empty
            "[&:empty]:before:pointer-events-none [&:empty]:before:text-zinc-600 [&:empty]:before:content-[attr(data-placeholder)]",
            // Content styling (no @tailwind/typography dependency)
            "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-50",
            "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-50",
            "[&_p]:my-2 [&_li]:my-0.5",
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_a]:text-cyan-400 [&_a]:underline [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic",
            "[&_:first-child]:mt-0"
          )}
        />
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // Keep the editor's selection/focus so execCommand applies to it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-cyan-300"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-white/10" />;
}
