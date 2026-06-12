import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating, count, size = "md",
}: {
  rating: number; count?: number; size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(cls, n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-zinc-200 text-zinc-200")}
          />
        ))}
      </div>
      {count !== undefined && <span className="text-xs text-zinc-400">({count})</span>}
    </div>
  );
}
