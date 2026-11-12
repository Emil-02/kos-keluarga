import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { PageHero, Section } from "@/components/public/sections";
import { WA_GREETING } from "@/components/public/site";
import { getSettings } from "@/lib/data/public";
import { whatsappLink } from "@/lib/format";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Peraturan",
    description: `Peraturan dan tata tertib penghuni ${settings.kos_name}.`,
  };
}

export default async function PeraturanPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHero
        eyebrow="Peraturan"
        title="Tata tertib penghuni"
        description="Aturan sederhana agar semua penghuni merasa aman, nyaman, dan rukun."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            {settings.rules.length > 0 ? (
              <ol className="space-y-4">
                {settings.rules.map((rule, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="pt-1 leading-relaxed text-stone-700">{rule}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon={<ScrollText className="size-6" />}
                title="Peraturan belum tersedia"
                description="Silakan hubungi pengelola untuk informasi tata tertib."
              />
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-brand-50 p-5 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-100">
            Dengan melakukan booking, Anda dianggap telah membaca dan menyetujui peraturan di atas. Ada pertanyaan?{" "}
            {settings.whatsapp ? (
              <a
                href={whatsappLink(settings.whatsapp, `${WA_GREETING} (peraturan kos)`)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline"
              >
                Tanyakan via WhatsApp
              </a>
            ) : (
              <Link href="/kontak" className="font-semibold text-brand-700 underline">
                Hubungi kami
              </Link>
            )}
            .
          </div>

          <div className="mt-8 text-center">
            <Link href="/booking" className={buttonClass("accent", "lg")}>
              Saya setuju, lanjut booking
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
