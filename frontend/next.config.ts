import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The CLI config parser fails on this repository's installed TypeScript output;
  // retain full build type-checking through the TypeScript compiler API instead.
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
