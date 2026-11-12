export const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/kamar", label: "Kamar" },
  { href: "/fasilitas", label: "Fasilitas" },
  { href: "/peraturan", label: "Peraturan" },
  { href: "/kontak", label: "Kontak" },
] as const;

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export const WA_GREETING = "Halo, saya ingin bertanya tentang kos";

export function googleMapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Hanya izinkan URL embed https agar iframe tidak memuat skema berbahaya. */
export function safeEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Tombol transparan untuk latar gelap (hero/CTA). */
export const GLASS_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20";
