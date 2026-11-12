import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, CalendarRange, HeartHandshake, MessageCircle, Ruler, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import {
  AvailabilityBadge,
  CtaBanner,
  FacilityGrid,
  FeatureList,
  GalleryGrid,
  LocationCard,
  PriceCards,
  Section,
  SectionHeading,
  TestimonialGrid,
} from "@/components/public/sections";
import { CONTAINER, GLASS_BUTTON, WA_GREETING } from "@/components/public/site";
import { startingPrice } from "@/components/public/periods";
import { getFacilities, getGallery, getRoomSummary, getSettings, getTestimonials } from "@/lib/data/public";
import { cn } from "@/lib/cn";
import { formatRupiah, PERIOD_UNIT, publicImageUrl, whatsappLink } from "@/lib/format";

export const revalidate = 60;

const WHY_US = [
  {
    icon: HeartHandshake,
    title: "Dikelola keluarga",
    text: "Pengelola tinggal dekat, ramah, dan sigap membantu — suasananya hangat seperti di rumah sendiri.",
  },
  {
    icon: ShieldCheck,
    title: "Aman & tenang",
    text: "Lingkungan kondusif dengan aturan yang jelas sehingga nyaman untuk beristirahat dan bekerja.",
  },
  {
    icon: CalendarRange,
    title: "Sewa fleksibel",
    text: "Pilih sewa harian, mingguan, atau bulanan sesuai kebutuhan Anda, tanpa ribet.",
  },
  {
    icon: Smartphone,
    title: "Serba online",
    text: "Booking, tagihan, bukti bayar, dan keluhan bisa diurus lewat portal penghuni dari HP.",
  },
];

export default async function HomePage() {
  const [settings, rooms, facilities, gallery, testimonials] = await Promise.all([
    getSettings(),
    getRoomSummary(),
    getFacilities(),
    getGallery(),
    getTestimonials(),
  ]);

  const start = startingPrice(settings);
  const heroImage = publicImageUrl(gallery[0]?.image_path);
  const roomImage = publicImageUrl(gallery[1]?.image_path);
  const roomFacilities = facilities.filter((f) => f.is_room_facility);
  const sharedFacilities = facilities.filter((f) => !f.is_room_facility);
  const roomItems = [...settings.room_features, ...roomFacilities.map((f) => f.name)];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <div aria-hidden className="absolute -top-32 -right-32 size-[28rem] rounded-full bg-accent-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-brand-300/25 blur-3xl" />
        <div className={cn(CONTAINER, "relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:py-24")}>
          <div>
            <AvailabilityBadge available={rooms.available} />
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {settings.kos_name}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-50/90 text-pretty">{settings.tagline}</p>
            {start && (
              <p className="mt-6 inline-flex flex-wrap items-baseline gap-x-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <span className="text-sm text-brand-100">Mulai dari</span>
                <span className="text-2xl font-extrabold text-accent-400">{formatRupiah(start.price)}</span>
                <span className="text-sm text-brand-100">/{PERIOD_UNIT[start.period]}</span>
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  <MessageCircle className="size-5" aria-hidden /> Chat WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-brand-200 via-brand-100 to-accent-400/40 shadow-2xl ring-1 ring-white/20">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={gallery[0]?.caption || `Foto ${settings.kos_name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-brand-800/80">
                  <HeartHandshake className="size-16" aria-hidden />
                  <p className="text-lg font-bold">Rumah kedua Anda</p>
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-stone-800 shadow-xl sm:-left-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-600">
                <Wallet className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold">Bayar mudah</p>
                <p className="text-xs text-stone-500">Transfer bank / QRIS</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keunggulan */}
      <Section tone="white">
        <SectionHeading
          eyebrow="Kenapa memilih kami"
          title="Nyaman, aman, dan terasa seperti rumah"
          description={settings.description || undefined}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_US.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-stone-50 p-6 ring-1 ring-stone-200/70">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                <Icon className="size-6" aria-hidden />
              </div>
              <h3 className="mt-5 font-bold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Harga */}
      <Section id="harga" tone="brand">
        <SectionHeading
          eyebrow="Harga sewa"
          title="Pilih periode sewa yang pas"
          description="Satu tipe kamar dengan fasilitas yang sama — Anda cukup memilih lama tinggal."
        />
        <PriceCards settings={settings} />
      </Section>

      {/* Kamar */}
      <Section tone="white">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-brand-200 via-brand-50 to-accent-400/30 shadow-lg">
              {roomImage ? (
                <Image
                  src={roomImage}
                  alt={gallery[1]?.caption || "Foto kamar"}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-800/70">
                  <BedDouble className="size-16" aria-hidden />
                  <p className="font-semibold">Foto kamar segera hadir</p>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <AvailabilityBadge available={rooms.available} className="shadow" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="Tentang kamar"
              title="Kamar rapi, siap huni"
              description="Semua kamar memiliki ukuran dan fasilitas yang sama, jadi Anda tahu persis apa yang didapat."
            />
            <div className="-mt-4 mb-6 flex flex-wrap gap-2">
              {settings.room_size && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                  <Ruler className="size-4" aria-hidden /> {settings.room_size}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">
                Maks. 2 orang per kamar
              </span>
            </div>
            {roomItems.length > 0 && <FeatureList items={roomItems} />}
            <Link href="/kamar" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
              Lihat detail kamar <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Section>

      {/* Fasilitas */}
      {sharedFacilities.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow="Fasilitas bersama"
            title="Semua yang Anda butuhkan sehari-hari"
            action={
              <Link href="/fasilitas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                Semua fasilitas <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <FacilityGrid facilities={sharedFacilities.slice(0, 8)} />
        </Section>
      )}

      {/* Galeri */}
      <Section tone="white">
        <SectionHeading eyebrow="Galeri" title="Intip suasana kos kami" />
        <GalleryGrid items={gallery} limit={8} />
      </Section>

      {/* Testimoni */}
      {testimonials.length > 0 && (
        <Section tone="brand">
          <SectionHeading eyebrow="Kata penghuni" title="Mereka sudah merasakan nyamannya" />
          <TestimonialGrid testimonials={testimonials} />
        </Section>
      )}

      {/* Lokasi */}
      <Section id="lokasi">
        <SectionHeading eyebrow="Lokasi" title="Mudah dijangkau" />
        <LocationCard settings={settings} />
      </Section>

      <Section className="pt-0 sm:pt-0">
        <CtaBanner settings={settings} />
      </Section>
    </>
  );
}
