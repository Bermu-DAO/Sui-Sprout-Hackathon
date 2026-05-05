import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cohortvault/ui", "@cohortvault/types", "@cohortvault/prompts"],
  outputFileTracingRoot: path.join(process.cwd(), "../..")
};

export default nextConfig;
