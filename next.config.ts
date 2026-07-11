import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  async rewrites() {
    return [
      { source: "/@:username", destination: "/users/:username" },
      { source: "/@:username/:path*", destination: "/users/:username" },
    ];
  },
  async headers() {
    const CORS = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Accept" },
    ];
    return [
      { source: "/api/:path*", headers: CORS },
      { source: "/nodeinfo/:path*", headers: CORS },
      { source: "/.well-known/:path*", headers: CORS },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
