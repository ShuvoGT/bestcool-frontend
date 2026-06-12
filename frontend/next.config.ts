import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Seed/demo placeholder images
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "picsum.photos" },
      // Files uploaded through the API's local storage provider
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
