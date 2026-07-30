import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          new URL(
            "/storage/v1/object/**",
            supabaseUrl,
          ),
        ]
      : [],
  },
};

export default nextConfig;
