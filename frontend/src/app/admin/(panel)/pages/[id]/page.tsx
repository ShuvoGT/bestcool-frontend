"use client";

/**
 * Pages CMS block editor — the heart of the admin panel.
 * Edit SEO meta, then add / edit / reorder / toggle / delete content blocks.
 */
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Plus, Save, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { TextField, TextareaField, ImageField } from "@/components/admin/fields";
import { BLOCK_TYPES, BlockContentEditor, blockLabel } from "@/components/admin/blocks";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = { id: string; type: string; content: Record<string, any>; sortOrder: number; isEnabled: boolean };
type PageData = {
  id: string; slug: string; title: string;
  metaTitle: string | null; metaDescription: string | null; ogImage: string | null;
  blocks: Block[];
};

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, loading, reload } = useLoad(
    () => api<{ page: PageData }>(`/admin/pages/${id}`).then((r) => r.page),
    [id]
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBlock, setSavingBlock] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Local edits per block (only persisted on Save)
  const [dirty, setDirty] = useState<Record<string, Block["content"]>>({});

  if (loading || !data) return <Spinner />;
  const page = data;

  const patchPage = (patch: Partial<PageData>) => setData({ ...page, ...patch });

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await api(`/admin/pages/${page.id}`, {
        method: "PUT",
        body: { title: page.title, metaTitle: page.metaTitle, metaDescription: page.metaDescription, ogImage: page.ogImage },
      });
      toast.success("Page settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveBlock(block: Block) {
    setSavingBlock(block.id);
    try {
      const content = dirty[block.id] ?? block.content;
      await api(`/admin/pages/${page.id}/blocks/${block.id}`, { method: "PUT", body: { content } });
      setDirty((d) => {
        const next = { ...d };
        delete next[block.id];
        return next;
      });
      patchPage({ blocks: page.blocks.map((b) => (b.id === block.id ? { ...b, content } : b)) });
      toast.success("Block saved — live on the storefront");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBlock(null);
    }
  }

  async function toggleBlock(block: Block) {
    try {
      await api(`/admin/pages/${page.id}/blocks/${block.id}`, { method: "PUT", body: { isEnabled: !block.isEnabled } });
      patchPage({ blocks: page.blocks.map((b) => (b.id === block.id ? { ...b, isEnabled: !b.isEnabled } : b)) });
      toast.success(block.isEnabled ? "Block hidden" : "Block visible");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deleteBlock(block: Block) {
    if (!confirm(`Delete this ${blockLabel(block.type)} block? This cannot be undone.`)) return;
    try {
      await api(`/admin/pages/${page.id}/blocks/${block.id}`, { method: "DELETE" });
      patchPage({ blocks: page.blocks.filter((b) => b.id !== block.id) });
      toast.success("Block deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function moveBlock(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= page.blocks.length) return;
    const blocks = [...page.blocks];
    [blocks[index], blocks[j]] = [blocks[j], blocks[index]];
    patchPage({ blocks });
    try {
      await api(`/admin/pages/${page.id}/blocks-order`, { method: "PUT", body: { blockIds: blocks.map((b) => b.id) } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
      reload();
    }
  }

  async function addBlock(type: string) {
    const def = BLOCK_TYPES.find((b) => b.type === type)!;
    try {
      const res = await api<{ block: Block }>(`/admin/pages/${page.id}/blocks`, {
        method: "POST",
        body: { type, content: def.defaults, isEnabled: true },
      });
      patchPage({ blocks: [...page.blocks, res.block] });
      setExpanded(res.block.id);
      setAddOpen(false);
      toast.success(`${def.label} block added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/pages" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400">
        <ArrowLeft className="h-4 w-4" /> All pages
      </Link>
      <PageHeader
        title={`Edit: ${page.title}`}
        subtitle={`Storefront URL: /${page.slug === "home" ? "" : page.slug}`}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500">
                <Plus className="mr-1 h-4 w-4" /> Add block
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle>Choose a block type</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_TYPES.map((b) => (
                  <button
                    key={b.type}
                    onClick={() => addBlock(b.type)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-medium text-zinc-200 transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* SEO / meta */}
      <GlassCard className="mb-6 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">Page Settings & SEO</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Page title" value={page.title} onChange={(v) => patchPage({ title: v })} />
            <TextField label="Meta title" value={page.metaTitle ?? ""} onChange={(v) => patchPage({ metaTitle: v })} />
          </div>
          <TextareaField
            label="Meta description"
            value={page.metaDescription ?? ""}
            onChange={(v) => patchPage({ metaDescription: v })}
            rows={2}
          />
          <ImageField label="OG image" value={page.ogImage ?? ""} onChange={(v) => patchPage({ ogImage: v || "" })} aspectHint="1200×630" />
          <Button onClick={saveMeta} disabled={savingMeta} className="bg-cyan-600 text-white hover:bg-cyan-500">
            {savingMeta ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save settings
          </Button>
        </div>
      </GlassCard>

      {/* Blocks */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Content Blocks ({page.blocks.length})
      </h2>
      {page.blocks.length === 0 && <GlassCard><EmptyState message="No blocks yet — add your first one above." /></GlassCard>}

      <div className="space-y-3">
        {page.blocks.map((block, i) => {
          const isOpen = expanded === block.id;
          const content = dirty[block.id] ?? block.content;
          const isDirty = block.id in dirty;
          return (
            <GlassCard key={block.id} className={cn("overflow-hidden transition-all", !block.isEnabled && "opacity-55")}>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : block.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-xs font-bold text-cyan-300">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium text-zinc-100">{blockLabel(block.type)}</span>
                  {isDirty && <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">unsaved</span>}
                  {!block.isEnabled && <span className="shrink-0 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">hidden</span>}
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => moveBlock(i, 1)} disabled={i === page.blocks.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-cyan-300" onClick={() => toggleBlock(block)} title={block.isEnabled ? "Hide" : "Show"}>
                    {block.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => deleteBlock(block)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-white/8 bg-black/20 p-4">
                  <BlockEditorLoader
                    type={block.type}
                    content={content}
                    onChange={(c) => setDirty((d) => ({ ...d, [block.id]: c }))}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => saveBlock(block)}
                      disabled={savingBlock === block.id || !isDirty}
                      className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-40"
                    >
                      {savingBlock === block.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                      Save block
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

/** Loads product/category options once per editor session for the pickers. */
function BlockEditorLoader(props: {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (c: Record<string, any>) => void;
}) {
  const { data } = useLoad(async () => {
    const needsProducts = props.type === "FEATURED_PRODUCTS" || props.type === "CATEGORY_PRODUCTS";
    const needsCategories = props.type === "FEATURED_CATEGORIES" || props.type === "CATEGORY_PRODUCTS";
    const [products, categories] = await Promise.all([
      needsProducts
        ? api<{ items: { id: string; name: string; image: string | null; category: { id: string } | null }[] }>("/admin/products", { query: { limit: 100 } }).then((r) => r.items)
        : Promise.resolve([]),
      needsCategories
        ? api<{ categories: { id: string; name: string }[] }>("/categories").then((r) => r.categories)
        : Promise.resolve([]),
    ]);
    return { products, categories };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.type]);

  return (
    <BlockContentEditor
      type={props.type}
      content={props.content}
      onChange={props.onChange}
      products={data?.products ?? []}
      categories={data?.categories ?? []}
    />
  );
}
