import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  experimental: { agentFeedback: true },
  async rewrites() {
    const backendUrl = (
      process.env.BACKEND_URL || "http://127.0.0.1:4000"
    ).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};
export default nextConfig;
