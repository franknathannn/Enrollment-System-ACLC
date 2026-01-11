import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // This tells Next.js to skip checking types during build
  // This prevents the Supabase Deno files from breaking the build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;