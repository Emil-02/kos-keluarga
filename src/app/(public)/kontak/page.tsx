import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { LocationCard, PageHero, Section } from "@/components/public/sections";
import { googleMapsSearchUrl, WA_GREETING } from "@/components/public/site";
import { getSettings } from "@/lib/data/public";
import { whatsappLink } from "@/lib/format";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Kontak",
    description: `Hubungi ${settings.kos_name} via WhatsApp atau email. ${settings.address}`.trim(),
  };
}

export default async function KontakPage() {
  const settings = await getSettings();

  const contacts = [
    settings.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings.whatsapp,
      href: whatsappLink(settings.whatsapp, WA_GREETING),
      external: true,
    },
    settings.email && {
      icon: Mail,
      label: "Email",
      value: settings.email,
      href: `mailto:${settings.email}`,
      external: false,
    },
    settings.address && {
      icon: MapPin,
      label: "Alamat",
      value: settings.address,
      href: googleMapsSearchUrl(settings.address),
      external: true,
    },
  ].filter((c) => !!c);

  return (
    <>
      <PageHero
        eyebrow="Kontak"
        title="Ada pertanyaan? Kami siap membantu"
        description="Hubungi pengelola langsung lewat WhatsApp atau email. Kami dengan senang hati menjawab pertanyaan Anda."
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            {contacts.map(({ icon: Icon, label, value, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-stone-500">{label}</span>
                  <span className="block font-semibold break-words text-stone-900">{value}</span>
                </span>
              </a>
            ))}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-3">
            <h2 className="text-xl font-bold text-stone-900">Kirim pertanyaan</h2>
            <p className="mt-1 mb-6 text-sm text-stone-500">
              Tulis pertanyaan Anda, lalu kami arahkan ke WhatsApp pengelola dengan pesan yang sudah terisi.
            </p>
            {settings.whatsapp ? (
              <ContactForm whatsapp={settings.whatsapp} kosName={settings.kos_name} />
            ) : (
              <p className="text-sm text-stone-500">Nomor WhatsApp pengelola belum tersedia.</p>
            )}
          </div>
        </div>
      </Section>

      <Section className="pt-0 sm:pt-0">
        <LocationCard settings={settings} />
      </Section>
    </>
  );
}
