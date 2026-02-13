import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Local development - Supabase local instance
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "192.168.254.133",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      // Production - Supabase hosted instance
      // Format: https://[project-ref].supabase.co
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // For local development, bypass Next.js image optimization
    // In production, Next.js will optimize images from Supabase
    unoptimized: process.env.NODE_ENV === "development",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
