import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const isLocalSupabase =
  supabaseUrl?.hostname === "127.0.0.1" || supabaseUrl?.hostname === "localhost";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl.origin}/storage/v1/object/public/**`)]
      : [],
    // Supabase lokal berjalan di 127.0.0.1 sehingga perlu diizinkan saat development.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  experimental: {
    serverActions: {
      // Vercel membatasi body request 4.5 MB; gambar dikompres di browser sebelum diunggah.
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
