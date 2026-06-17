import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const name = (settings["site.name"] as string) || "Best Cool Electronics";
  const icon = (settings["site.favicon"] as string) || (settings["site.logo"] as string) || "/favicon.ico";
  return {
    name,
    short_name: name,
    description: (settings["seo.defaultDescription"] as string) || "Genuine electronics in Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#06b6d4",
    icons: [{ src: icon, sizes: "any" }],
  };
}
