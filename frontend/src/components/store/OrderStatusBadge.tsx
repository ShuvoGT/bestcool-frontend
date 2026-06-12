import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
  COD_PENDING: "bg-amber-100 text-amber-700",
  REFUNDED: "bg-zinc-100 text-zinc-600",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STYLES[status] ?? "bg-zinc-100 text-zinc-600")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
