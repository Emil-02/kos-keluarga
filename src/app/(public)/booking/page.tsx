import type { Metadata } from "next";
import { ClipboardList, KeyRound, MessageCircle } from "lucide-react";
import { BookingForm } from "@/components/public/booking-form";
import { MAX_ADVANCE_MONTHS, periodOptions } from "@/components/public/periods";
import { PageHero, Section } from "@/components/public/sections";
import { WA_GREETING } from "@/components/public/site";
import { buttonClass } from "@/components/ui/button";
import { getRoomSummary, getSettings } from "@/lib/data/public";
import { addPeriod, todayISO, whatsappLink } from "@/lib/format";
import type { RentPeriod } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Booking Kamar",
    description: `Booking kamar ${settings.kos_name} secara online — sewa harian, mingguan, atau bulanan.`,
  };
}

const STEPS = [
  { icon: ClipboardList, title: "Isi formulir", text: "Lengkapi data diri, periode sewa, dan foto KTP." },
  { icon: MessageCircle, title: "Konfirmasi pengelola", text: "Kami cek ketersediaan & menghubungi Anda via WhatsApp." },
  { icon: KeyRound, title: "Bayar & masuk", text: "Bayar via transfer/QRIS, lalu akses portal penghuni." },
];

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ periode?: string | string[] }> }) {
  const [{ periode }, settings, rooms] = await Promise.all([searchParams, getSettings(), getRoomSummary()]);
  const options = periodOptions(settings);
  const requested = typeof periode === "string" ? (periode as RentPeriod) : undefined;
  const today = todayISO();

  return (
    <>
      <PageHero
        eyebrow="Booking online"
        title="Booking kamar dalam 3 langkah"
        description="Tanpa bayar di muka. Pengelola akan menghubungi Anda untuk konfirmasi sebelum tagihan dikirim."
      />

      <Section className="pt-8 sm:pt-10">
        <ol className="mb-8 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">
                  {i + 1}. {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        {options.length > 0 ? (
          <BookingForm
            options={options}
            deposit={settings.deposit}
            today={today}
            maxStart={addPeriod(today, "bulanan", MAX_ADVANCE_MONTHS)}
            defaultPeriod={requested}
            availableNow={rooms.available}
          />
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-stone-900">Booking online belum dibuka</p>
            <p className="mt-1 text-sm text-stone-500">Harga sewa belum diatur. Silakan hubungi pengelola untuk informasi kamar.</p>
            {settings.whatsapp && (
              <a
                href={whatsappLink(settings.whatsapp, WA_GREETING)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("primary", "md", "mt-5")}
              >
                Chat WhatsApp
              </a>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
