import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, CheckCircle2, Clock, FileText, QrCode, XCircle } from "lucide-react";
import { CopyButton } from "@/components/tenant/copy-button";
import { formatPeriodRange, InvoiceStatusBadge, PAYMENT_METHOD_LABEL, PaymentStatusBadge } from "@/components/tenant/badges";
import { PaymentForm } from "@/components/tenant/payment-form";
import { LinkButton } from "@/components/ui/button";
import { Alert, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { daysBetween, formatDate, formatDateTime, formatRupiah, isOverdue, publicImageUrl, todayISO } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Detail Tagihan" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TYPE_LABEL = {
  sewa: "Sewa kamar",
  deposit: "Deposit",
  listrik: "Listrik",
  denda: "Denda",
  lainnya: "Lainnya",
} as const;

export default async function TenantInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireTenant();
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, tenancies!inner(tenant_id, rooms(number))")
    .eq("id", id)
    .maybeSingle();
  if (!invoice || invoice.tenancies.tenant_id !== user.id) notFound();

  const [{ data: paymentRows }, settings] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, proof_path, paid_on, status, note, admin_note, created_at")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false }),
    getSettings(),
  ]);
  const payments = paymentRows ?? [];
  // kepemilikan sudah dipastikan lewat RLS di atas, aman membuat signed URL
  const proofUrls = await signedUrls(payments.map((p) => p.proof_path));

  const today = todayISO();
  const overdue = isOverdue(invoice);
  const range = formatPeriodRange(invoice.period_start, invoice.period_end);
  const lastRejected = invoice.status === "belum_bayar" && payments[0]?.status === "ditolak" ? payments[0] : null;
  const qrisUrl = publicImageUrl(settings.qris_path);
  const hasBank = Boolean(settings.bank_name && settings.bank_account_number);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/penghuni/tagihan" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ArrowLeft className="size-4" /> Kembali ke daftar tagihan
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">{invoice.description}</h1>
          <InvoiceStatusBadge invoice={invoice} />
        </div>
        <p className="mt-1 font-mono text-sm text-stone-500">{invoice.number}</p>
      </div>

      {invoice.status === "menunggu_verifikasi" && (
        <Alert tone="info">
          <span className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" />
            Bukti pembayaran Anda sudah kami terima dan sedang diverifikasi oleh pengelola. Anda akan mendapat notifikasi setelah
            diverifikasi.
          </span>
        </Alert>
      )}
      {invoice.status === "lunas" && (
        <Alert tone="success">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Tagihan ini sudah LUNAS{invoice.paid_at ? ` pada ${formatDate(invoice.paid_at)}` : ""}. Terima kasih!
            </span>
            <LinkButton href={`/kwitansi/${invoice.id}`} size="sm" variant="primary">
              <FileText className="size-4" /> Lihat kwitansi
            </LinkButton>
          </span>
        </Alert>
      )}
      {invoice.status === "dibatalkan" && <Alert tone="warning">Tagihan ini telah dibatalkan dan tidak perlu dibayar.</Alert>}
      {lastRejected && (
        <Alert tone="error">
          <span className="flex items-start gap-2">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              Bukti pembayaran sebelumnya <strong>ditolak</strong>
              {lastRejected.admin_note ? `: ${lastRejected.admin_note}` : "."} Silakan unggah ulang bukti yang benar.
            </span>
          </span>
        </Alert>
      )}
      {overdue && (
        <Alert tone="error">
          Tagihan ini sudah terlambat {daysBetween(invoice.due_date, today)} hari (jatuh tempo {formatDate(invoice.due_date)}). Mohon
          segera dibayar.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Rincian tagihan" />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Info label="Jenis" value={TYPE_LABEL[invoice.type]} />
                <Info label="Kamar" value={invoice.tenancies.rooms?.number ?? "-"} />
                {range && <Info label="Periode" value={range} />}
                <Info label="Jatuh tempo" value={formatDate(invoice.due_date)} />
                <Info label="Dibuat" value={formatDate(invoice.created_at)} />
                {invoice.paid_at && <Info label="Dibayar" value={formatDateTime(invoice.paid_at)} />}
              </dl>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                <span className="text-sm font-medium text-stone-600">Jumlah</span>
                <span className="text-xl font-bold text-stone-900">{formatRupiah(invoice.amount)}</span>
              </div>
            </CardBody>
          </Card>

          {invoice.status === "belum_bayar" && (
            <Card>
              <CardHeader title="Unggah bukti pembayaran" description="Setelah membayar, unggah bukti agar pengelola dapat memverifikasi." />
              <CardBody>
                <PaymentForm invoiceId={invoice.id} today={today} hasQris={Boolean(qrisUrl)} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Riwayat pembayaran" />
            {payments.length === 0 ? (
              <EmptyState icon={<Banknote className="size-6" />} title="Belum ada pembayaran" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {payments.map((p) => {
                  const url = p.proof_path ? proofUrls[p.proof_path] : null;
                  return (
                    <li key={p.id} className="flex gap-4 px-5 py-4">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0" title="Lihat bukti">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Bukti pembayaran" className="size-16 rounded-lg border border-stone-200 object-cover" />
                        </a>
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                          <Banknote className="size-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-stone-900">{formatRupiah(p.amount)}</span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="mt-0.5 text-stone-600">
                          {PAYMENT_METHOD_LABEL[p.method]} · dibayar {formatDate(p.paid_on)}
                        </p>
                        <p className="text-xs text-stone-400">Dikirim {formatDateTime(p.created_at)}</p>
                        {p.note && <p className="mt-1 text-stone-600">Catatan Anda: {p.note}</p>}
                        {p.admin_note && <p className="mt-1 text-stone-700">Catatan pengelola: {p.admin_note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {(invoice.status === "belum_bayar" || invoice.status === "menunggu_verifikasi") && (
          <div className="order-first lg:order-none lg:col-span-2">
            <Card className="lg:sticky lg:top-6">
              <CardHeader title="Cara pembayaran" description="Transfer sesuai jumlah tagihan, lalu unggah buktinya." />
              <CardBody className="space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Jumlah yang dibayar</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-2xl font-bold text-brand-700">{formatRupiah(invoice.amount)}</span>
                    <CopyButton value={String(invoice.amount)} />
                  </div>
                </div>

                {hasBank && (
                  <div className="rounded-xl border border-stone-200 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <Banknote className="size-4 text-brand-600" /> Transfer bank
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-stone-500">Bank</dt>
                        <dd className="font-semibold text-stone-900">{settings.bank_name}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-stone-500">No. rekening</dt>
                        <dd className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-stone-900">{settings.bank_account_number}</span>
                          <CopyButton value={settings.bank_account_number ?? ""} />
                        </dd>
                      </div>
                      {settings.bank_account_name && (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-stone-500">Atas nama</dt>
                          <dd className="flex items-center gap-2 text-right">
                            <span className="font-semibold text-stone-900">{settings.bank_account_name}</span>
                            <CopyButton value={settings.bank_account_name} />
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {qrisUrl && (
                  <div className="rounded-xl border border-stone-200 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <QrCode className="size-4 text-brand-600" /> QRIS
                    </p>
                    <Image
                      src={qrisUrl}
                      alt={`QRIS ${settings.kos_name}`}
                      width={320}
                      height={320}
                      className="mx-auto mt-3 h-auto w-full max-w-64 rounded-lg"
                    />
                    <p className="mt-2 text-center text-xs text-stone-500">Pindai dengan aplikasi bank / e-wallet apa pun.</p>
                  </div>
                )}

                {!hasBank && !qrisUrl && (
                  <p className="text-sm text-stone-600">
                    Informasi rekening belum tersedia. Silakan hubungi pengelola
                    {settings.whatsapp ? ` via WhatsApp ${settings.whatsapp}` : ""}.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
