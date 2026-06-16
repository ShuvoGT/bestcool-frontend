"use client";

/**
 * Per-block-type content editors for the Pages CMS.
 * Each editor receives the block's JSON `content` and reports changes up;
 * the parent owns saving. Block shapes mirror backend/seed conventions.
 */
import { useState } from "react";
import Image from "next/image";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField, ImageField, NumberField, SwitchField } from "@/components/admin/fields";
import { RichTextField } from "@/components/admin/RichTextField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EditorProduct = { id: string; name: string; image?: string | null; category?: { id: string } | null };

export const BLOCK_TYPES: { type: string; label: string; defaults: Record<string, unknown> }[] = [
  { type: "HERO_SLIDER", label: "Hero Slider", defaults: { slides: [{ image: "", heading: "", subheading: "", buttonText: "", buttonLink: "" }] } },
  { type: "BANNER", label: "Banner Image", defaults: { image: "", link: "", alt: "" } },
  { type: "RICH_TEXT", label: "Rich Text", defaults: { html: "<p>Write something…</p>" } },
  { type: "IMAGE_TEXT", label: "Image + Text", defaults: { image: "", layout: "left", heading: "", html: "" } },
  { type: "IMAGE_GALLERY", label: "Image Gallery", defaults: { heading: "", images: [] } },
  { type: "FEATURED_PRODUCTS", label: "Featured Products", defaults: { heading: "Featured Products", subheading: "", productIds: [] } },
  { type: "FEATURED_CATEGORIES", label: "Featured Categories", defaults: { heading: "Shop by Category", categoryIds: [] } },
  { type: "CATEGORY_PRODUCTS", label: "Category Products", defaults: { heading: "", categoryId: "", productIds: [], limit: 8 } },
  { type: "FLASH_SALE", label: "Flash Sale", defaults: { heading: "⚡ Flash Sale", subheading: "" } },
  { type: "TESTIMONIALS", label: "Testimonials", defaults: { heading: "What Our Customers Say", items: [] } },
  { type: "FAQ", label: "FAQ", defaults: { heading: "Frequently Asked Questions", items: [] } },
  { type: "CONTACT_INFO", label: "Contact Info", defaults: { heading: "Get in Touch", phone: "", email: "", address: "", hours: "" } },
  { type: "MAP_EMBED", label: "Google Map", defaults: { heading: "", embedUrl: "" } },
];

export const blockLabel = (type: string) => BLOCK_TYPES.find((b) => b.type === type)?.label ?? type;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Content = Record<string, any>;
type EditorProps = {
  content: Content;
  onChange: (content: Content) => void;
  products: EditorProduct[];
  categories: { id: string; name: string }[];
};

/** Generic list editor with add / remove / reorder. */
function ItemList<T>({
  items, onChange, blank, title, render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  title: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-white/8 bg-white/3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {title} {i + 1}
            </span>
            <span className="flex gap-1">
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" onClick={() => move(i, -1)}>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-zinc-400" onClick={() => move(i, 1)}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" size="icon" variant="ghost"
                className="h-6 w-6 text-zinc-400 hover:text-red-400"
                onClick={() => onChange(items.filter((_, x) => x !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </span>
          </div>
          <div className="space-y-3">{render(item, (patch) => onChange(items.map((it, x) => (x === i ? { ...it, ...patch } : it))), i)}</div>
        </div>
      ))}
      <Button
        type="button" variant="outline" size="sm"
        className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
        onClick={() => onChange([...items, blank])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add {title.toLowerCase()}
      </Button>
    </div>
  );
}

function PickList({
  all, selectedIds, onChange,
}: {
  all: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((item) => {
        const active = selectedIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              active
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.25)]"
                : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
            )}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Category-wise product section editor (spec: dynamic homepage rows).
 * Pick a category → auto-show all its products, or switch to manual curation
 * with native drag-and-drop ordering + add/remove.
 */
function CategoryProductsEditor({ content, onChange, products, categories }: EditorProps) {
  const set = (patch: Content) => onChange({ ...content, ...patch });
  const categoryId = (content.categoryId as string) || "";
  const productIds = (content.productIds as string[]) ?? [];
  const manual = productIds.length > 0;
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Products belonging to the chosen category (admin list includes category).
  const inCategory = products.filter((p) => p.category?.id === categoryId);
  const byId = new Map(products.map((p) => [p.id, p]));
  const chosen = productIds.map((id) => byId.get(id)).filter(Boolean) as EditorProduct[];
  const available = inCategory.filter((p) => !productIds.includes(p.id));

  function pickCategory(id: string) {
    // Switch category → reset any manual order (keeps it simple + predictable).
    set({ categoryId: id, productIds: [] });
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...productIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set({ productIds: next });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-zinc-300">Category</Label>
          <Select value={categoryId} onValueChange={pickCategory}>
            <SelectTrigger className="border-white/10 bg-white/5 text-zinc-100"><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <TextField label="Heading (blank = category name)" value={(content.heading as string) ?? ""} onChange={(v) => set({ heading: v })} />
      </div>
      <NumberField label="Max products to show" value={(content.limit as number) ?? 8} onChange={(v) => set({ limit: v === "" ? 8 : v })} min={1} />

      {!categoryId ? (
        <p className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-zinc-500">Pick a category to load its products.</p>
      ) : (
        <>
          <SwitchField
            label="Curate & reorder manually"
            description={manual ? "Drag to reorder; remove or add products below." : "Off = automatically show all products from this category (newest first)."}
            checked={manual}
            onChange={(on) => set({ productIds: on ? inCategory.map((p) => p.id) : [] })}
          />

          {manual && (
            <div className="space-y-3">
              {/* Chosen products — draggable */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">In this section ({chosen.length}) — drag to reorder</Label>
                <div className="space-y-1.5">
                  {chosen.map((p, i) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) { reorder(dragIndex, i); setDragIndex(i); } }}
                      onDragEnd={() => setDragIndex(null)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 p-2 transition-opacity",
                        dragIndex === i && "opacity-50"
                      )}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-500" />
                      <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-bold text-zinc-400">{i + 1}</span>
                      {p.image && (
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                          <Image src={p.image} alt="" fill unoptimized className="object-cover" />
                        </span>
                      )}
                      <span className="flex-1 truncate text-sm text-zinc-200">{p.name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => set({ productIds: productIds.filter((id) => id !== p.id) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {chosen.length === 0 && <p className="text-xs text-zinc-500">No products yet — add from below.</p>}
                </div>
              </div>

              {/* Available products to add */}
              {available.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Add more</Label>
                  <div className="flex flex-wrap gap-2">
                    {available.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => set({ productIds: [...productIds, p.id] })}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                      >
                        <Plus className="h-3 w-3" /> {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BlockContentEditor({ type, content, onChange, products, categories }: EditorProps & { type: string }) {
  const set = (patch: Content) => onChange({ ...content, ...patch });

  switch (type) {
    case "HERO_SLIDER":
      return (
        <ItemList
          items={(content.slides ?? []) as Content[]}
          onChange={(slides) => set({ slides })}
          blank={{ image: "", heading: "", subheading: "", buttonText: "", buttonLink: "" }}
          title="Slide"
          render={(s, update) => (
            <>
              <ImageField label="Image" value={s.image ?? ""} onChange={(v) => update({ image: v })} aspectHint="1600×600 recommended" />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Heading" value={s.heading ?? ""} onChange={(v) => update({ heading: v })} />
                <TextField label="Subheading" value={s.subheading ?? ""} onChange={(v) => update({ subheading: v })} />
                <TextField label="Button text" value={s.buttonText ?? ""} onChange={(v) => update({ buttonText: v })} />
                <TextField label="Button link" value={s.buttonLink ?? ""} onChange={(v) => update({ buttonLink: v })} placeholder="/shop" />
              </div>
            </>
          )}
        />
      );

    case "BANNER":
      return (
        <div className="space-y-3">
          <ImageField label="Banner image" value={content.image ?? ""} onChange={(v) => set({ image: v })} aspectHint="1600×300 recommended" />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Link (optional)" value={content.link ?? ""} onChange={(v) => set({ link: v })} placeholder="/shop" />
            <TextField label="Alt text" value={content.alt ?? ""} onChange={(v) => set({ alt: v })} />
          </div>
        </div>
      );

    case "RICH_TEXT":
      return (
        <RichTextField
          label="Content"
          value={content.html ?? ""}
          onChange={(v) => set({ html: v })}
          minHeight={240}
          hint="Use the toolbar for headings, lists, links and bold. Unsafe tags are stripped on save."
        />
      );

    case "IMAGE_TEXT":
      return (
        <div className="space-y-3">
          <ImageField label="Image" value={content.image ?? ""} onChange={(v) => set({ image: v })} />
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Image position</Label>
            <div className="flex gap-2">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => set({ layout: side })}
                  className={cn(
                    "rounded-md border px-4 py-1.5 text-xs font-medium capitalize",
                    (content.layout ?? "left") === side
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  )}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <RichTextField label="Text" value={content.html ?? ""} onChange={(v) => set({ html: v })} minHeight={160} />
        </div>
      );

    case "IMAGE_GALLERY":
      return (
        <div className="space-y-3">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <ItemList
            items={(content.images ?? []) as Content[]}
            onChange={(images) => set({ images })}
            blank={{ url: "", alt: "" }}
            title="Image"
            render={(img, update) => (
              <>
                <ImageField label="Image" value={img.url ?? ""} onChange={(v) => update({ url: v })} />
                <TextField label="Alt text" value={img.alt ?? ""} onChange={(v) => update({ alt: v })} />
              </>
            )}
          />
        </div>
      );

    case "FEATURED_PRODUCTS":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
            <TextField label="Subheading" value={content.subheading ?? ""} onChange={(v) => set({ subheading: v })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Products ({(content.productIds ?? []).length} selected)</Label>
            <PickList all={products} selectedIds={(content.productIds ?? []) as string[]} onChange={(productIds) => set({ productIds })} />
          </div>
        </div>
      );

    case "FEATURED_CATEGORIES":
      return (
        <div className="space-y-3">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Categories ({(content.categoryIds ?? []).length} selected)</Label>
            <PickList all={categories} selectedIds={(content.categoryIds ?? []) as string[]} onChange={(categoryIds) => set({ categoryIds })} />
          </div>
        </div>
      );

    case "CATEGORY_PRODUCTS":
      return <CategoryProductsEditor content={content} onChange={onChange} products={products} categories={categories} />;

    case "FLASH_SALE":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
            <TextField label="Subheading" value={content.subheading ?? ""} onChange={(v) => set({ subheading: v })} />
          </div>
          <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/8 px-3 py-2 text-xs text-cyan-300">
            ⚡ The currently running campaign (from Flash Sales) renders here automatically with a live countdown.
          </p>
        </div>
      );

    case "TESTIMONIALS":
      return (
        <div className="space-y-3">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <ItemList
            items={(content.items ?? []) as Content[]}
            onChange={(items) => set({ items })}
            blank={{ name: "", location: "", rating: 5, text: "" }}
            title="Testimonial"
            render={(t, update) => (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label="Name" value={t.name ?? ""} onChange={(v) => update({ name: v })} />
                  <TextField label="Location" value={t.location ?? ""} onChange={(v) => update({ location: v })} />
                  <NumberField label="Rating (1–5)" value={t.rating ?? 5} onChange={(v) => update({ rating: v === "" ? 5 : Math.min(5, Math.max(1, v)) })} min={1} />
                </div>
                <TextareaField label="Quote" value={t.text ?? ""} onChange={(v) => update({ text: v })} rows={3} />
              </>
            )}
          />
        </div>
      );

    case "FAQ":
      return (
        <div className="space-y-3">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <ItemList
            items={(content.items ?? []) as Content[]}
            onChange={(items) => set({ items })}
            blank={{ question: "", answer: "" }}
            title="Question"
            render={(q, update) => (
              <>
                <TextField label="Question" value={q.question ?? ""} onChange={(v) => update({ question: v })} />
                <TextareaField label="Answer" value={q.answer ?? ""} onChange={(v) => update({ answer: v })} rows={3} />
              </>
            )}
          />
        </div>
      );

    case "CONTACT_INFO":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <TextField label="Phone" value={content.phone ?? ""} onChange={(v) => set({ phone: v })} />
          <TextField label="Email" value={content.email ?? ""} onChange={(v) => set({ email: v })} />
          <TextField label="Opening hours" value={content.hours ?? ""} onChange={(v) => set({ hours: v })} />
          <div className="sm:col-span-2">
            <TextField label="Address" value={content.address ?? ""} onChange={(v) => set({ address: v })} />
          </div>
        </div>
      );

    case "MAP_EMBED":
      return (
        <div className="space-y-3">
          <TextField label="Heading" value={content.heading ?? ""} onChange={(v) => set({ heading: v })} />
          <TextareaField
            label="Google Maps embed URL"
            value={content.embedUrl ?? ""}
            onChange={(v) => set({ embedUrl: v })}
            rows={3}
            hint='From Google Maps → Share → Embed a map → copy the src="…" URL only.'
          />
        </div>
      );

    default:
      return <p className="text-sm text-zinc-500">No editor available for this block type.</p>;
  }
}
