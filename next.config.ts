// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // trigger env resync
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "chsmesvozsjcgrwuimld.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control",          value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type",           value: "application/javascript" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest:path*.json",
        headers: [
          { key: "Content-Type",  value: "application/manifest+json" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/opengraph-image.png",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/twitter-image.png",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
};

export default nextConfig;
