import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/kamar", priority: 0.9, changeFrequency: "weekly" },
    { path: "/booking", priority: 0.9, changeFrequency: "weekly" },
    { path: "/fasilitas", priority: 0.7, changeFrequency: "monthly" },
    { path: "/peraturan", priority: 0.5, changeFrequency: "monthly" },
    { path: "/kontak", priority: 0.6, changeFrequency: "monthly" },
  ];
  return pages.map((p) => ({
    url: siteUrl(p.path === "/" ? "" : p.path),
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
