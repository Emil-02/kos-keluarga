import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, KeyRound, MessageCircle, Send, XCircle } from "lucide-react";
import { PageHero, Section } from "@/components/public/sections";
import { periodPrice } from "@/components/public/periods";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/card";
import { getSettings } from "@/lib/data/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/cn";
import { addPeriod, formatDate, formatDateTime, formatRupiah, PERIOD_LABEL, PERIOD_UNIT, whatsappLink } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status Booking",
  robots: { index: false, follow: false },
};

const STATUS_BADGE: Record<BookingStatus, { label: string; tone: "yellow" | "green" | "red" | "gray" }> = {
  menunggu: { label: "Menunggu konfirmasi", tone: "yellow" },
  disetujui: { label: "Disetujui", tone: "green" },
  ditolak: { label: "Ditolak", tone: "red" },
  dibatalkan: { label: "Dibatalkan", tone: "gray" },
};

export default async function BookingStatusPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const code = decodeURIComponent(kode).trim().toUpperCase();
  if (!/^KK-[A-Z0-9]{6}$/.test(code)) notFound();

  const [settings, { data: booking }] = await Promise.all([
    getSettings(),
    createAdminClient()
      .from("bookings")
      .select("code, full_name, period, start_date, duration, end_date, occupants, status, admin_note, created_at, decided_at, rooms(number)")
      .eq("code", code)
      .maybeSingle(),
  ]);
  if (!booking) notFound();

  const status = booking.status;
  const price = periodPrice(settings, booking.period);
  const deposit = booking.period === "bulanan" ? settings.deposit : 0;
  const estimate = price * booking.duration + deposit;
  const unit = PERIOD_UNIT[booking.period];
  const waText = `Halo, saya ${booking.full_name}. Saya ingin menanyakan booking dengan kode ${booking.code}.`;
  const waHref = settings.whatsapp ? whatsappLink(settings.whatsapp, waText) : null;
  const decided = status !== "menunggu";
  const rejected = status === "ditolak" || status === "dibatalkan";

  const steps = [
    { title: "Booking dikirim", time: formatDateTime(booking.created_at), done: true, icon: Send },
    {
      title: "Diperiksa pengelola",
      time: decided ? "Selesai" : "Sedang diproses",
      done: decided,
      active: !decided,
      icon: Clock,
    },
    {
      title: rejected ? STATUS_BADGE[status].label : "Disetujui",
      time: decided ? (booking.decided_at ? formatDateTime(booking.decided_at) : "Selesai") : "Menunggu",
      done: decided,
      icon: rejected ? XCircle : CheckCircle2,
      error: rejected,
    },
  ];

  return (
    <>
      <PageHero eyebrow="Status booking" title={`Booking ${booking.code}`} description="Simpan kode booking ini untuk mengecek status kapan saja." />

      <Section className="pt-8 sm:pt-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold text-stone-900">Status</h2>
                <Badge tone={STATUS_BADGE[status].tone} className="text-sm">
                  {STATUS_BADGE[status].label}
                </Badge>
              </div>

              <ol className="mt-6 space-y-0">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < steps.length - 1 && (
                        <span
                          aria-hidden
                          className={cn("absolute top-10 left-5 h-[calc(100%-2.5rem)] w-0.5", step.done ? "bg-brand-300" : "bg-stone-200")}
                        />
                      )}
                      <span
                        className={cn(
                          "relative flex size-10 shrink-0 items-center justify-center rounded-full",
                          step.error
                            ? "bg-red-100 text-red-600"
                            : step.done
                              ? "bg-brand-600 text-white"
                              : step.active
                                ? "bg-amber-100 text-amber-600 ring-4 ring-amber-50"
                                : "bg-stone-100 text-stone-400",
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="pt-1.5">
                        <p className={cn("font-semibold", step.done || step.active ? "text-stone-900" : "text-stone-400")}>{step.title}</p>
                        <p className="text-sm text-stone-500">{step.time}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {status === "menunggu" && (
              <Alert tone="info">
                <p className="font-semibold">Booking Anda sedang kami periksa.</p>
                <p className="mt-1">
                  Pengelola akan menghubungi Anda melalui WhatsApp, biasanya dalam 1×24 jam. Belum perlu melakukan pembayaran
                  sekarang — tagihan dikirim setelah booking disetujui.
                </p>
              </Alert>
            )}

            {status === "disetujui" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <p className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="size-5" aria-hidden /> Selamat, booking Anda disetujui!
                </p>
                {booking.rooms?.number && (
                  <p className="mt-3 text-emerald-900">
                    Kamar Anda: <span className="rounded-lg bg-white px-2.5 py-1 text-lg font-extrabold">{booking.rooms.number}</span>
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-emerald-800">
                  Cek WhatsApp/email Anda untuk informasi akun portal penghuni & tagihan pembayaran. Pembayaran dilakukan melalui
                  transfer bank atau QRIS, lalu unggah bukti bayar di portal.
                </p>
                {booking.admin_note && <p className="mt-3 text-sm text-emerald-800">Catatan pengelola: {booking.admin_note}</p>}
                <Link href="/login" className={buttonClass("primary", "md", "mt-5")}>
                  <KeyRound className="size-4" aria-hidden /> Masuk ke portal penghuni
                </Link>
              </div>
            )}

            {rejected && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
                <p className="font-bold text-red-900">
                  {status === "ditolak" ? "Mohon maaf, booking Anda belum dapat kami terima." : "Booking ini telah dibatalkan."}
                </p>
                {booking.admin_note && <p className="mt-2 text-sm text-red-800">Keterangan: {booking.admin_note}</p>}
                <p className="mt-2 text-sm text-red-800">Silakan hubungi kami via WhatsApp untuk informasi atau pilihan tanggal lain.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {waHref && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
                      <MessageCircle className="size-4" aria-hidden /> Hubungi via WhatsApp
                    </a>
                  )}
                  <Link href="/booking" className={buttonClass("outline", "md")}>
                    Booking ulang
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <h2 className="border-b border-stone-100 px-5 py-4 font-bold text-stone-900">Ringkasan booking</h2>
              <dl className="space-y-3 px-5 py-4 text-sm">
                <Row label="Kode" value={<span className="font-mono font-bold">{booking.code}</span>} />
                <Row label="Nama" value={booking.full_name} />
                <Row label="Periode" value={`Sewa ${PERIOD_LABEL[booking.period].toLowerCase()}`} />
                <Row label={booking.period === "harian" ? "Check-in" : "Mulai"} value={formatDate(booking.start_date)} />
                <Row label={booking.period === "harian" ? "Lama menginap" : "Bayar di muka"} value={`${booking.duration} ${unit}`} />
                {booking.period === "harian" ? (
                  <Row label="Check-out" value={formatDate(booking.end_date)} />
                ) : (
                  <Row label="Lunas s.d." value={`${booking.end_date ? formatDate(addPeriod(booking.end_date, "harian", -1)) : "-"} (lalu diperpanjang otomatis per ${unit})`} />
                )}
                <Row label="Penghuni" value={`${booking.occupants} orang`} />
              </dl>
              {status !== "ditolak" && status !== "dibatalkan" && price > 0 && (
                <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-stone-500">Estimasi pembayaran awal</span>
                    <span className="text-lg font-extrabold text-stone-900">{formatRupiah(estimate)}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatRupiah(price)} × {booking.duration} {unit}
                    {deposit > 0 && ` + deposit ${formatRupiah(deposit)} (dikembalikan saat keluar)`}. Jumlah final mengikuti tagihan
                    resmi.
                  </p>
                </div>
              )}
            </div>

            {waHref && !rejected && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md", "w-full")}>
                <MessageCircle className="size-4" aria-hidden /> Tanya pengelola via WhatsApp
              </a>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-stone-800">{value}</dd>
    </div>
  );
}
