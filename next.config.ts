import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We remove the turbopack aliases because they are 
  // actually causing the Edge Runtime (middleware) to crash.
  reactCompiler: true,
};

export default nextConfig;
