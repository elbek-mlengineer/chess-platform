import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  experimental: { agentFeedback: true },
};
export default nextConfig;
