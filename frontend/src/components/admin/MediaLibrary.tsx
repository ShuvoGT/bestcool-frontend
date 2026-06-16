"use client";

/**
 * Reusable media browser used by both the Media admin page and the media picker.
 * Lists uploaded files (image/video/document) with a kind filter + filename
 * search, supports uploading straight from the computer, and — depending on the
 * props — either selecting an item (picker) or deleting it (library page).
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Copy, FileText, Film, Loader2, Search, Trash2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { api, uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/admin/ui";

export type MediaItem = {
  id: string;
  url: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  kind: "image" | "video" | "document";
  size: number | null;
  createdAt: string;
};

type Kind = "all" | "image" | "video" | "document";

const KIND_TABS: { key: Kind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "document", label: "Documents" },
];

// File-input accept attributes per kind.
const ACCEPT: Record<Kind, string> = {
  all: "image/*,video/*,application/pdf,.doc,.docx",
  image: "image/*",
  video: "video/*",
  document: "application/pdf,.doc,.docx",
};

function fmtSize(b: number | null): string {
  if (b == null) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({
  selectable = false,
  onSelect,
  showDelete = false,
  lockKind,
}: {
  selectable?: boolean;
  onSelect?: (m: MediaItem) => void;
  showDelete?: boolean;
  lockKind?: "image" | "video" | "document"; // force a single kind + hide tabs
}) {
  const [kind, setKind] = useState<Kind>(lockKind ?? "all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounce the search box.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [kind, debounced]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ items: MediaItem[]; total: number; pages: number }>("/admin/media", {
      query: { kind: kind === "all" ? undefined : kind, search: debounced || undefined, page, limit: 40 },
    })
      .then((r) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
        setPages(r.pages);
        setTotal(r.total);
      })
      .catch((e) => !cancelled && toast.error(e instanceof Error ? e.message : "Failed to load media"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [kind, debounced, page]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: MediaItem[] = [];
    try {
      for (const file of Array.from(files)) {
        try {
          const r = await uploadFile(file);
          // The upload endpoint returns light info; reload the first page to get
          // the canonical record (with id/size/date) — but optimistically prepend.
          if (r.id) {
            uploaded.push({
              id: r.id,
              url: r.url,
              storageKey: r.key ?? "",
              filename: r.filename,
              mimeType: file.type,
              kind: r.kind,
              size: file.size,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          toast.error(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
        }
      }
      if (uploaded.length) {
        // Show new uploads first; respect the active kind filter.
        const visible = uploaded.filter((m) => kind === "all" || m.kind === kind);
        setItems((prev) => [...visible, ...prev]);
        setTotal((t) => t + uploaded.length);
        toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(m: MediaItem) {
    if (!confirm(`Delete "${m.filename}"? Anywhere it's already used will show a broken link.`)) return;
    try {
      await api(`/admin/media/${m.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function copyUrl(m: MediaItem) {
    const abs = m.url.startsWith("http") ? m.url : `${window.location.origin}${m.url}`;
    navigator.clipboard?.writeText(abs).then(
      () => toast.success("URL copied"),
      () => toast.error("Copy failed")
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {!lockKind && (
          <div className="flex flex-wrap gap-1.5">
            {KIND_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setKind(t.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  kind === t.key ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="relative min-w-50 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            className="border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT[lockKind ?? kind]}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
        >
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          Upload from computer
        </Button>
      </div>

      {loading && page === 1 ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState message="No media yet — upload your first file above." />
      ) : (
        <>
          <p className="text-xs text-zinc-500">{total} file{total === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-white/10 bg-white/4 transition-all",
                  selectable && "cursor-pointer hover:border-cyan-400/50 hover:ring-2 hover:ring-cyan-400/30"
                )}
                onClick={selectable ? () => onSelect?.(m) : undefined}
              >
                <div className="relative flex aspect-square items-center justify-center bg-zinc-900/60">
                  {m.kind === "image" ? (
                    <Image src={m.url} alt={m.filename} fill unoptimized className="object-cover" />
                  ) : m.kind === "video" ? (
                    <Film className="h-9 w-9 text-violet-300" />
                  ) : (
                    <FileText className="h-9 w-9 text-sky-300" />
                  )}
                  {selectable && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-cyan-500/0 opacity-0 transition-all group-hover:bg-cyan-500/10 group-hover:opacity-100">
                      <span className="flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-white">
                        <Check className="h-3.5 w-3.5" /> Select
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="truncate text-[11px] font-medium text-zinc-300" title={m.filename}>{m.filename}</div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">{m.kind}{m.size ? ` · ${fmtSize(m.size)}` : ""}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Copy URL"
                        onClick={(e) => { e.stopPropagation(); copyUrl(m); }}
                        className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-cyan-300"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {showDelete && (
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); remove(m); }}
                          className="rounded p-1 text-zinc-500 hover:bg-red-500/15 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {page < pages && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
                className="border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
              >
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
