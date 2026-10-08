import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      // CORS for routes the proxy does not add CORS to (it covers /api,
      // /nodeinfo and the AP rewrites). Keeping a single source per path
      // prevents duplicated Access-Control-Allow-Origin headers.
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
