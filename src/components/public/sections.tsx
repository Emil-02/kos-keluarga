import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Check, ExternalLink, House, MapPin, Sofa, Star, Trees } from "lucide-react";
import { FacilityIcon } from "@/components/facility-icon";
import { buttonClass } from "@/components/ui/button";
import { CONTAINER, GLASS_BUTTON, googleMapsSearchUrl, safeEmbedUrl, WA_GREETING } from "@/components/public/site";
import { PERIOD_DESCRIPTION, periodOptions } from "@/components/public/periods";
import { cn } from "@/lib/cn";
import { formatRupiah, PERIOD_LABEL, PERIOD_UNIT, publicImageUrl, whatsappLink } from "@/lib/format";
import type { Facility, GalleryItem, Settings, Testimonial } from "@/lib/types";

export function Section({
  id,
  className,
  children,
  tone = "default",
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "white" | "brand";
}) {
  const toneClass = { default: "", white: "bg-white", brand: "bg-brand-50/60" }[tone];
  return (
    <section id={id} className={cn("scroll-mt-20 py-14 sm:py-20", toneClass, className)}>
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  align?: "center" | "left";
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-end gap-4",
        align === "center" ? "flex-col items-center text-center" : "justify-between",
      )}
    >
      <div className={cn(align === "center" && "max-w-2xl")}>
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">{title}</h2>
        {description && <p className="mt-3 text-base leading-relaxed text-stone-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Judul halaman untuk subhalaman publik. */
export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-accent-400/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -left-16 size-72 rounded-full bg-brand-300/20 blur-3xl" />
      <div className={cn(CONTAINER, "relative py-12 sm:py-16")}>
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-accent-400 uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-50/90">{description}</p>}
      </div>
    </div>
  );
}

export function AvailabilityBadge({ available, className }: { available: number; className?: string }) {
  const hasRoom = available > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset",
        hasRoom ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200",
        className,
      )}
    >
      <span className="relative flex size-2.5">
        {hasRoom && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
        <span className={cn("relative inline-flex size-2.5 rounded-full", hasRoom ? "bg-emerald-500" : "bg-amber-500")} />
      </span>
      {hasRoom ? `${available} kamar tersedia` : "Kamar sedang penuh"}
    </span>
  );
}

export function PriceCards({ settings }: { settings: Settings }) {
  const options = periodOptions(settings);
  if (options.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500">
        Harga sewa belum tersedia. Silakan hubungi kami via WhatsApp.
      </p>
    );
  }
  return (
    <div>
      <div
        className={cn(
          "mx-auto grid gap-5",
          options.length === 1 && "max-w-sm",
          options.length === 2 && "max-w-3xl sm:grid-cols-2",
          options.length === 3 && "md:grid-cols-3",
        )}
      >
        {options.map(({ period, price }) => {
          const featured = period === "bulanan";
          return (
            <div
              key={period}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                featured ? "border-brand-600 bg-brand-700 text-white" : "border-stone-200 bg-white",
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-white shadow">
                  Paling hemat
                </span>
              )}
              <p className={cn("text-sm font-semibold uppercase tracking-wide", featured ? "text-brand-100" : "text-brand-700")}>
                Sewa {PERIOD_LABEL[period]}
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">{formatRupiah(price)}</span>
                <span className={cn("text-sm", featured ? "text-brand-100" : "text-stone-500")}>/{PERIOD_UNIT[period]}</span>
              </p>
              <p className={cn("mt-2 text-sm", featured ? "text-brand-50/90" : "text-stone-600")}>{PERIOD_DESCRIPTION[period]}</p>
              {period === "bulanan" && settings.deposit > 0 && (
                <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-brand-50">
                  + Deposit {formatRupiah(settings.deposit)} (dikembalikan saat keluar)
                </p>
              )}
              <div className="flex-1" />
              <Link
                href={`/booking?periode=${period}`}
                className={buttonClass(featured ? "accent" : "secondary", "md", "mt-6 w-full")}
              >
                Booking {PERIOD_LABEL[period].toLowerCase()}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        Pembayaran melalui transfer bank atau QRIS setelah booking disetujui pengelola.
        {settings.deposit > 0 && options.some((o) => o.period === "bulanan") && (
          <> Deposit hanya berlaku untuk sewa bulanan.</>
        )}
      </p>
    </div>
  );
}

export function FeatureList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm text-stone-700 ring-1 ring-stone-200">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Check className="size-3.5" aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function FacilityGrid({ facilities }: { facilities: Facility[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {facilities.map((f) => (
        <div key={f.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <FacilityIcon name={f.icon} className="size-5" aria-hidden />
          </div>
          <h3 className="mt-4 font-semibold text-stone-900">{f.name}</h3>
          {f.description && <p className="mt-1 text-sm leading-relaxed text-stone-500">{f.description}</p>}
        </div>
      ))}
    </div>
  );
}

const PLACEHOLDERS = [
  { icon: BedDouble, label: "Kamar tidur", gradient: "from-brand-200 via-brand-100 to-accent-400/30" },
  { icon: Sofa, label: "Ruang bersama", gradient: "from-accent-400/40 via-amber-100 to-brand-100" },
  { icon: House, label: "Tampak depan", gradient: "from-brand-300 via-brand-100 to-stone-100" },
  { icon: Trees, label: "Lingkungan", gradient: "from-emerald-200 via-brand-50 to-accent-400/20" },
];

export function GalleryGrid({ items, limit }: { items: GalleryItem[]; limit?: number }) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {PLACEHOLDERS.map(({ icon: Icon, label, gradient }, i) => (
          <div
            key={label}
            className={cn(
              "relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br text-brand-800/70",
              gradient,
              i === 0 && "lg:col-span-2 lg:row-span-2 lg:aspect-auto",
            )}
          >
            <Icon className={cn(i === 0 ? "size-12" : "size-8")} aria-hidden />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-brand-800/60">Foto segera hadir</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {shown.map((item, i) => {
        const src = publicImageUrl(item.image_path);
        if (!src) return null;
        const big = i === 0 && shown.length >= 3;
        return (
          <figure
            key={item.id}
            className={cn(
              "group relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200",
              big && "col-span-2 lg:row-span-2 lg:aspect-auto",
            )}
          >
            <Image
              src={src}
              alt={item.caption || "Foto kos"}
              fill
              sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            {item.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-2.5 text-xs font-medium text-white sm:text-sm">
                {item.caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Rating ${rating} dari 5`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < rating ? "fill-accent-400 text-accent-400" : "fill-stone-200 text-stone-200")}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {testimonials.slice(0, 6).map((t) => (
        <figure key={t.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <Stars rating={t.rating} />
          <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-stone-700">“{t.content}”</blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {t.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-stone-900">{t.name}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function LocationCard({ settings }: { settings: Settings }) {
  const embed = safeEmbedUrl(settings.maps_embed_url);
  const mapsLink = settings.address ? googleMapsSearchUrl(settings.address) : null;
  return (
    <div className="grid overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm lg:grid-cols-5">
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:col-span-2">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600">
          <MapPin className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-900">Alamat</h3>
          <p className="mt-1 leading-relaxed text-stone-600">{settings.address || "Alamat belum diatur."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
              <ExternalLink className="size-4" aria-hidden /> Buka di Google Maps
            </a>
          )}
          {settings.whatsapp && (
            <a
              href={whatsappLink(settings.whatsapp, `${WA_GREETING}. Boleh minta petunjuk arah ke lokasi?`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md")}
            >
              Tanya arah
            </a>
          )}
        </div>
      </div>
      <div className="relative min-h-72 bg-gradient-to-br from-brand-100 via-brand-50 to-accent-400/20 lg:col-span-3">
        {embed ? (
          <iframe
            src={embed}
            title={`Peta lokasi ${settings.kos_name}`}
            className="absolute inset-0 size-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-md">
              <MapPin className="size-8" aria-hidden />
            </div>
            {mapsLink ? (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-800 hover:underline">
                Lihat lokasi di Google Maps
              </a>
            ) : (
              <p className="font-semibold text-brand-800">Peta segera tersedia</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CtaBanner({ settings, title, description }: { settings: Settings; title?: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-center text-white shadow-lg sm:px-12">
      <div aria-hidden className="absolute -top-20 -left-20 size-64 rounded-full bg-accent-400/20 blur-3xl" />
      <div aria-hidden className="absolute -right-16 -bottom-24 size-64 rounded-full bg-brand-300/20 blur-3xl" />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title ?? "Siap tinggal dengan nyaman?"}</h2>
        <p className="mt-3 text-brand-50/90">
          {description ?? `Booking kamar di ${settings.kos_name} hanya butuh beberapa menit. Pengelola akan segera menghubungi Anda.`}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/booking" className={buttonClass("accent", "lg")}>
            Booking sekarang <ArrowRight className="size-4" aria-hidden />
          </Link>
          {settings.whatsapp && (
            <a
              href={whatsappLink(settings.whatsapp, WA_GREETING)}
              target="_blank"
              rel="noopener noreferrer"
              className={GLASS_BUTTON}
            >
              Chat WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
