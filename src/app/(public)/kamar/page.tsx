import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BedDouble, CalendarCheck, Ruler, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import {
  AvailabilityBadge,
  CtaBanner,
  FeatureList,
  GalleryGrid,
  PageHero,
  PriceCards,
  Section,
  SectionHeading,
} from "@/components/public/sections";
import { getFacilities, getGallery, getRoomSummary, getSettings } from "@/lib/data/public";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Kamar",
    description: `Detail kamar ${settings.kos_name}: ukuran ${settings.room_size ?? "nyaman"}, fasilitas lengkap, dan harga sewa harian, mingguan, maupun bulanan.`,
  };
}

export default async function KamarPage() {
  const [settings, rooms, facilities, gallery] = await Promise.all([
    getSettings(),
    getRoomSummary(),
    getFacilities(),
    getGallery(),
  ]);
  const roomItems = [...settings.room_features, ...facilities.filter((f) => f.is_room_facility).map((f) => f.name)];

  const stats = [
    { icon: Ruler, label: "Ukuran kamar", value: settings.room_size || "-" },
    { icon: Users, label: "Kapasitas", value: "1–2 orang" },
    { icon: BedDouble, label: "Total kamar", value: `${rooms.total} kamar` },
    { icon: CalendarCheck, label: "Tersedia hari ini", value: `${rooms.available} kamar` },
  ];

  return (
    <>
      <PageHero
        eyebrow="Kamar"
        title="Satu tipe kamar, nyaman untuk semua"
        description="Semua kamar memiliki ukuran dan fasilitas yang sama. Pilih lama sewa sesuai kebutuhan Anda."
      />

      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <GalleryGrid items={gallery} limit={7} />
          </div>
          <div className="lg:col-span-2">
            <AvailabilityBadge available={rooms.available} />
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-stone-900">Spesifikasi kamar</h2>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200/70">
                  <Icon className="size-5 text-brand-600" aria-hidden />
                  <dt className="mt-2 text-xs font-medium text-stone-500">{label}</dt>
                  <dd className="font-bold text-stone-900">{value}</dd>
                </div>
              ))}
            </dl>
            {rooms.available === 0 && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Saat ini semua kamar terisi. Anda tetap dapat booking untuk tanggal mendatang — kami akan mengecek ketersediaannya.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/booking" className={buttonClass("accent", "lg")}>
                Booking kamar <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/fasilitas" className={buttonClass("outline", "lg")}>
                Lihat fasilitas
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {roomItems.length > 0 && (
        <Section>
          <SectionHeading eyebrow="Di dalam kamar" title="Fasilitas kamar" />
          <FeatureList items={roomItems} className="mx-auto max-w-3xl" />
        </Section>
      )}

      <Section id="harga" tone="brand">
        <SectionHeading eyebrow="Harga sewa" title="Pilih periode sewa yang pas" />
        <PriceCards settings={settings} />
      </Section>

      <Section>
        <CtaBanner settings={settings} />
      </Section>
    </>
  );
}
