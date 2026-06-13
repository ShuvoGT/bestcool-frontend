"use client";

/** Description / Additional info / Reviews tabs with a review form. */
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { RatingStars } from "@/components/store/RatingStars";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ProductDetailData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

type Review = { id: string; rating: number; comment: string; author: string; createdAt: string };

export function ProductTabs({ product, reviews: initialReviews }: { product: ProductDetailData; reviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api(`/products/${product.slug}/reviews`, { method: "POST", body: { rating, comment } });
      toast.success("Thank you! Your review has been posted.");
      const fresh = await api<{ reviews: Review[] }>(`/products/${product.slug}/reviews`);
      setReviews(fresh.reviews);
      setComment("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Please log in to leave a review — accounts open at checkout.");
      } else {
        toast.error(err instanceof Error ? err.message : "Could not post review");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Tabs defaultValue="description" className="mt-12">
      <TabsList className="w-full justify-start gap-2 rounded-none border-b border-zinc-200 bg-transparent p-0">
        {[
          { value: "description", label: "Description" },
          { value: "info", label: "Additional Info" },
          { value: "reviews", label: `Reviews (${reviews.length})` },
        ].map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="rounded-none border-b-2 border-transparent px-4 pb-3 font-semibold text-zinc-500 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand data-[state=active]:shadow-none"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="description" className="pt-6">
        <div
          className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-zinc-600 [&_li]:mb-1.5 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-zinc-900"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </TabsContent>

      <TabsContent value="info" className="pt-6">
        <table className="w-full max-w-xl text-sm">
          <tbody className="divide-y divide-zinc-100">
            {[
              ["SKU", product.sku ?? "—"],
              ["Category", product.category?.name ?? "—"],
              ["Stock", product.stock > 0 ? `${product.stock} units` : "Out of stock"],
              ...(product.variants.length
                ? [["Available variants", product.variants.map((v) => v.name).join(", ")] as [string, string]]
                : []),
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="w-44 py-2.5 font-semibold text-zinc-900">{k}</td>
                <td className="py-2.5 text-zinc-600">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabsContent>

      <TabsContent value="reviews" className="pt-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {reviews.length === 0 ? (
              <p className="text-sm text-zinc-500">No reviews yet — be the first to review this product.</p>
            ) : (
              <ul className="space-y-5">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-900">{r.author}</span>
                      <span className="text-xs text-zinc-400">{formatDate(r.createdAt)}</span>
                    </div>
                    <RatingStars rating={r.rating} size="sm" />
                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-zinc-600">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={submitReview} className="h-fit rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <h3 className="mb-3 font-bold text-zinc-900">Write a review</h3>
            <div className="mb-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                  <Star className={cn("h-7 w-7 transition-colors", n <= rating ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200 hover:fill-amber-200")} />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product…"
              rows={4}
              className="bg-white"
            />
            <Button type="submit" disabled={submitting} className="mt-3 bg-brand text-white hover:bg-brand-dark">
              Submit review
            </Button>
            <p className="mt-2 text-xs text-zinc-400">You need an account to review — one is created automatically when you order.</p>
          </form>
        </div>
      </TabsContent>
    </Tabs>
  );
}
