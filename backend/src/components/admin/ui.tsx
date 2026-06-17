"use client";

/** Small shared building blocks for the admin panel's glass aesthetic. */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-white/8 bg-white/4 shadow-xl shadow-black/20 backdrop-blur-md", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-14 text-center text-sm text-zinc-500">{message}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  CONFIRMED: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  SHIPPED: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  CANCELLED: "bg-red-500/15 text-red-300 border-red-400/30",
  PAID: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  FAILED: "bg-red-500/15 text-red-300 border-red-400/30",
  COD_PENDING: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  REFUNDED: "bg-zinc-500/15 text-zinc-300 border-zinc-400/30",
  Running: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  Scheduled: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  Ended: "bg-zinc-500/15 text-zinc-400 border-zinc-400/30",
  Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-400/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-400/30"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
