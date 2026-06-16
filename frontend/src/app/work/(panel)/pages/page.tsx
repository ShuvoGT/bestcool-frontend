"use client";

import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { GlassCard, PageHeader, Spinner } from "@/components/admin/ui";

type PageRow = { id: string; slug: string; title: string; blockCount: number; updatedAt: string };

export default function AdminPagesList() {
  const { data, loading } = useLoad(() => api<{ pages: PageRow[] }>("/admin/pages"));

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Pages" subtitle="Every storefront page is built from editable content blocks" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.pages.map((p) => (
          <Link key={p.id} href={`/work/pages/${p.id}`}>
            <GlassCard className="group flex items-center gap-4 p-5 transition-all hover:border-cyan-400/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-100">{p.title}</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  /{p.slug === "home" ? "" : p.slug} · {p.blockCount} block{p.blockCount === 1 ? "" : "s"} · updated {formatDateTime(p.updatedAt)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-400" />
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
