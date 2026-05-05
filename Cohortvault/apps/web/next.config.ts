import path from "node:path";
import type { NextConfig } from "next";

const apiProxyTarget = process.env.COHORTVAULT_API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@cohortvault/ui", "@cohortvault/types", "@cohortvault/prompts"],
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${apiProxyTarget}/:path*`
      }
    ];
  }
};

export default nextConfig;
