import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSettings } from "@/lib/server-api";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = (settings["site.name"] as string) || "Best Cool Electronics";
  return {
    // `absolute` bypasses the site-wide title template (no double suffix).
    title: { absolute: `Admin — ${siteName}` },
    robots: { index: false, follow: false },
  };
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
