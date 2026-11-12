import type { Metadata } from "next";
import { Check } from "lucide-react";
import { FacilityIcon } from "@/components/facility-icon";
import { EmptyState } from "@/components/ui/card";
import { CtaBanner, FacilityGrid, PageHero, Section, SectionHeading } from "@/components/public/sections";
import { getFacilities, getSettings } from "@/lib/data/public";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Fasilitas",
    description: `Fasilitas kamar dan fasilitas bersama di ${settings.kos_name}.`,
  };
}

export default async function FasilitasPage() {
  const [settings, facilities] = await Promise.all([getSettings(), getFacilities()]);
  const roomFacilities = facilities.filter((f) => f.is_room_facility);
  const sharedFacilities = facilities.filter((f) => !f.is_room_facility);
  const roomItems = [
    ...roomFacilities.map((f) => ({ key: f.id, name: f.name, description: f.description, icon: f.icon })),
    ...settings.room_features
      .filter((name) => !roomFacilities.some((f) => f.name.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ key: name, name, description: null, icon: null })),
  ];

  return (
    <>
      <PageHero
        eyebrow="Fasilitas"
        title="Fasilitas lengkap untuk kenyamanan Anda"
        description="Dari perlengkapan di dalam kamar hingga fasilitas bersama yang bisa dinikmati semua penghuni."
      />

      <Section tone="white">
        <SectionHeading
          eyebrow="Di dalam kamar"
          title="Fasilitas kamar"
          description={settings.room_size ? `Setiap kamar berukuran ${settings.room_size}.` : undefined}
        />
        {roomItems.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roomItems.map((item) => (
              <li key={item.key} className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200/70">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  {item.icon ? (
                    <FacilityIcon name={item.icon} className="size-5" aria-hidden />
                  ) : (
                    <Check className="size-5" aria-hidden />
                  )}
                </span>
                <div>
                  <p className="font-semibold text-stone-900">{item.name}</p>
                  {item.description && <p className="mt-0.5 text-sm text-stone-500">{item.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada data fasilitas kamar" />
        )}
      </Section>

      <Section>
        <SectionHeading eyebrow="Untuk semua penghuni" title="Fasilitas bersama" />
        {sharedFacilities.length > 0 ? (
          <FacilityGrid facilities={sharedFacilities} />
        ) : (
          <EmptyState title="Belum ada data fasilitas bersama" />
        )}
      </Section>

      <Section className="pt-0 sm:pt-0">
        <CtaBanner settings={settings} />
      </Section>
    </>
  );
}
