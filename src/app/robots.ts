import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/penghuni", "/akun", "/kwitansi", "/api", "/booking/"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
