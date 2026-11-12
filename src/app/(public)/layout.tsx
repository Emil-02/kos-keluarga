import { Footer } from "@/components/public/footer";
import { Navbar } from "@/components/public/navbar";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { getSettings } from "@/lib/data/public";

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar kosName={settings.kos_name} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton phone={settings.whatsapp} />
    </div>
  );
}
