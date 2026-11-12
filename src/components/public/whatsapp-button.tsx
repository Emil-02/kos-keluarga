import { MessageCircle } from "lucide-react";
import { WA_GREETING } from "@/components/public/site";
import { whatsappLink } from "@/lib/format";

export function WhatsAppButton({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a
      href={whatsappLink(phone, WA_GREETING)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp dengan pengelola"
      className="group fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-lg shadow-emerald-900/20 ring-4 ring-white/70 transition hover:scale-105 hover:bg-[#1ebe5a] sm:right-6 sm:bottom-6 sm:px-5"
    >
      <MessageCircle className="size-6" aria-hidden />
      <span className="hidden text-sm font-semibold sm:inline">Chat WhatsApp</span>
    </a>
  );
}
