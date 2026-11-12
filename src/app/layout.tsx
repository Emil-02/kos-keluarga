import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSettings } from "@/lib/data/public";
import { siteUrl } from "@/lib/format";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = `${settings.kos_name} — ${settings.tagline}`;
  const description =
    settings.description ||
    `Sewa kamar kos harian, mingguan, dan bulanan di ${settings.kos_name}. ${settings.address}`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${settings.kos_name}` },
    description,
    openGraph: { title, description, type: "website", locale: "id_ID", siteName: settings.kos_name },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
