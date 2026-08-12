import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        hostname: "nizvigrplhvbvafwvcmy.supabase.co",
        pathname: "/storage/v1/object/public/product-media/**",
        protocol: "https",
      },
    ],
  },
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;

initOpenNextCloudflareForDev();
