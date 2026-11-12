import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatPeriodRange, PAYMENT_METHOD_LABEL } from "@/components/tenant/badges";
import { PrintButton } from "@/components/tenant/print-button";
import { LinkButton } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { formatDate, formatRupiah } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kwitansi Pembayaran",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireUser(`/kwitansi/${id}`);
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  // RLS: hanya pemilik tagihan atau admin yang dapat melihat
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, number, description, amount, status, paid_at, period_start, period_end, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name, email)), payments(method, status, paid_on, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!invoice || invoice.status !== "lunas") notFound();

  const settings = await getSettings();
  const accepted = invoice.payments
    .filter((p) => p.status === "diterima")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const tenant = invoice.tenancies.profiles;
  const tenantName = tenant?.full_name || tenant?.email || "-";
  const range = formatPeriodRange(invoice.period_start, invoice.period_end);
  const words = terbilangRupiah(invoice.amount);
  const backHref = profile.role === "admin" ? "/admin/tagihan" : `/penghuni/tagihan/${invoice.id}`;

  return (
    <div className="min-h-dvh px-4 py-8 print:p-0">
      <style>{"@page { size: A5 portrait; margin: 10mm; }"}</style>

      <div className="no-print mx-auto mb-6 flex max-w-[148mm] flex-wrap items-center justify-between gap-3">
        <LinkButton href={backHref} variant="outline">
          <ArrowLeft className="size-4" /> Kembali
        </LinkButton>
        <PrintButton />
      </div>

      <article className="relative mx-auto max-w-[148mm] overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 text-stone-800 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b-2 border-brand-700 pb-4 text-center">
          <p className="text-xl font-bold text-brand-800">{settings.kos_name}</p>
          {settings.address && <p className="mt-1 text-xs text-stone-600">{settings.address}</p>}
          {settings.whatsapp && <p className="text-xs text-stone-600">WhatsApp: {settings.whatsapp}</p>}
        </header>

        <h1 className="mt-5 text-center text-lg font-bold tracking-[0.2em] text-stone-900">KWITANSI PEMBAYARAN</h1>
        <p className="text-center font-mono text-sm text-stone-500">No. {invoice.number}</p>

        <dl className="mt-6 space-y-2.5 text-sm">
          <Row label="Tanggal bayar" value={formatDate(invoice.paid_at)} />
          <Row label="Telah diterima dari" value={tenantName} strong />
          <Row label="Kamar" value={invoice.tenancies.rooms?.number ?? "-"} />
          <Row label="Untuk pembayaran" value={invoice.description} />
          {range && <Row label="Periode" value={range} />}
          <Row label="Metode pembayaran" value={accepted ? PAYMENT_METHOD_LABEL[accepted.method] : "-"} />
        </dl>

        <div className="mt-6 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 print:bg-white">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Jumlah</p>
          <p className="text-2xl font-bold text-stone-900">{formatRupiah(invoice.amount)}</p>
          <p className="mt-1 text-sm italic text-stone-600">
            Terbilang: {words.charAt(0).toUpperCase() + words.slice(1)}
          </p>
        </div>

        <div className="mt-8 flex items-end justify-between gap-6 text-sm">
          <div
            aria-label="Lunas"
            className="-rotate-12 rounded-lg border-4 border-double border-emerald-600 px-4 py-1 text-2xl font-black tracking-[0.3em] text-emerald-600 opacity-80"
          >
            LUNAS
          </div>
          <div className="text-center">
            <p className="text-stone-600">{formatDate(invoice.paid_at)}</p>
            <p className="text-stone-600">Pengelola,</p>
            <p className="mt-12 font-semibold text-stone-900">{settings.kos_name}</p>
          </div>
        </div>

        <p className="mt-8 border-t border-stone-200 pt-3 text-center text-[11px] text-stone-400">
          Kwitansi ini dibuat secara elektronik dan sah tanpa tanda tangan basah.
        </p>
      </article>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] gap-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className={strong ? "font-semibold text-stone-900" : "text-stone-800"}>: {value}</dd>
    </div>
  );
}
