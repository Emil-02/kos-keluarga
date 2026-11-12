import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "@/components/public/navbar";
import { CONTAINER, NAV_LINKS, WA_GREETING } from "@/components/public/site";
import { whatsappLink } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Settings } from "@/lib/types";

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-brand-950 text-brand-100/80">
      <div className={cn(CONTAINER, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4")}>
        <div className="lg:col-span-2">
          <Logo name={settings.kos_name} light />
          <p className="mt-4 max-w-md text-sm leading-relaxed">{settings.tagline}</p>
          <Link
            href="/booking"
            className="mt-5 inline-flex items-center rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Booking kamar sekarang
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Tautan</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/booking" className="hover:text-white">
                Booking
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Masuk portal penghuni
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Kontak</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {settings.address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                <span>{settings.address}</span>
              </li>
            )}
            {settings.whatsapp && (
              <li>
                <a
                  href={whatsappLink(settings.whatsapp, WA_GREETING)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-2.5 hover:text-white"
                >
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                  <span>{settings.whatsapp}</span>
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="flex gap-2.5 break-all hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                  <span>{settings.email}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className={cn(CONTAINER, "py-5 text-center text-xs text-brand-100/60 sm:text-left")}>
          © {year} {settings.kos_name}. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
