import type { NextConfig } from "next";

// Allow product images served from the API's /uploads folder, in dev and in
// production. The production host is derived from NEXT_PUBLIC_API_URL so the
// same config works on any domain (e.g. your Hostinger domain).
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
let apiImagePattern: { protocol: "http" | "https"; hostname: string; port?: string; pathname: string } | null = null;
try {
  const u = new URL(apiUrl);
  apiImagePattern = {
    protocol: u.protocol.replace(":", "") as "http" | "https",
    hostname: u.hostname,
    ...(u.port ? { port: u.port } : {}),
    pathname: "/uploads/**",
  };
} catch {
  /* invalid URL — fall back to the localhost dev pattern below */
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Seed/demo placeholder images
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "picsum.photos" },
      // Reference images hotlinked from akijce.com (used during design)
      { protocol: "https", hostname: "akijce.com" },
      { protocol: "https", hostname: "www.akijce.com" },
      // Uploaded product images stored on Cloudinary (production)
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      // Uploaded product images from the API /uploads folder (local-disk storage:
      // dev localhost + any production host derived from NEXT_PUBLIC_API_URL)
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
      ...(apiImagePattern ? [apiImagePattern] : []),
    ],
  },
};

export default nextConfig;
