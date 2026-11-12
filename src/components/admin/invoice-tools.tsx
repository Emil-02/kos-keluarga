import Link from "next/link";
import { BellRing, Check, FileText, X } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PAYMENT_METHOD_LABEL } from "@/components/admin/badges";
import { cancelInvoiceAction, recordPaymentAction, sendReminderAction, verifyPaymentAction } from "@/actions/admin/tenancies";
import { formatDate, formatDateTime, formatRupiah, todayISO } from "@/lib/format";
import type { Invoice, Payment } from "@/lib/types";

/** Kartu verifikasi bukti pembayaran dari penghuni. */
export function PaymentReview({
  payment,
  proofUrl,
  invoice,
  tenantName,
  roomNumber,
}: {
  payment: Pick<Payment, "id" | "amount" | "method" | "paid_on" | "note" | "created_at" | "proof_path">;
  proofUrl: string | null;
  invoice: Pick<Invoice, "number" | "description" | "amount">;
  tenantName?: string;
  roomNumber?: string;
}) {
  const isPdf = payment.proof_path?.endsWith(".pdf");
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:flex-row">
      <div className="shrink-0">
        {proofUrl ? (
          <a href={proofUrl} target="_blank" rel="noreferrer" title="Buka ukuran penuh">
            {isPdf ? (
              <span className="flex h-40 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-600">
                <FileText className="size-8" /> PDF
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt="Bukti pembayaran" className="h-40 w-32 rounded-xl border border-stone-200 bg-white object-cover hover:opacity-90" />
            )}
          </a>
        ) : (
          <span className="flex h-40 w-32 items-center justify-center rounded-xl border border-dashed border-stone-300 text-xs text-stone-400">
            Tanpa bukti
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {tenantName && (
          <p className="font-semibold text-stone-900">
            {tenantName}
            {roomNumber && <span className="font-normal text-stone-500"> · Kamar {roomNumber}</span>}
          </p>
        )}
        <p className="text-sm text-stone-700">
          {invoice.number} — {invoice.description}
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-500">Nominal</dt>
          <dd className="font-semibold">{formatRupiah(payment.amount)}</dd>
          <dt className="text-stone-500">Metode</dt>
          <dd>{PAYMENT_METHOD_LABEL[payment.method]}</dd>
          <dt className="text-stone-500">Tanggal bayar</dt>
          <dd>{formatDate(payment.paid_on)}</dd>
          <dt className="text-stone-500">Dikirim</dt>
          <dd>{formatDateTime(payment.created_at)}</dd>
        </dl>
        {payment.note && <p className="mt-2 rounded-lg bg-white p-2 text-sm text-stone-600">“{payment.note}”</p>}

        <ActionForm action={verifyPaymentAction} className="mt-3 space-y-2">
          <input type="hidden" name="payment_id" value={payment.id} />
          <Textarea name="admin_note" rows={1} placeholder="Catatan (wajib jika menolak)" aria-label="Catatan verifikasi" />
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="decision" value="terima" size="sm" confirm="Terima pembayaran ini? Tagihan akan ditandai lunas.">
              <Check className="size-4" /> Terima
            </SubmitButton>
            <SubmitButton name="decision" value="tolak" size="sm" variant="danger" confirm="Tolak bukti pembayaran ini?">
              <X className="size-4" /> Tolak
            </SubmitButton>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}

/** Aksi untuk satu tagihan: catat bayar, kirim pengingat, batalkan, kwitansi. */
export function InvoiceActions({ invoice }: { invoice: Pick<Invoice, "id" | "status" | "amount"> }) {
  if (invoice.status === "lunas") {
    return (
      <Link href={`/kwitansi/${invoice.id}`} target="_blank" className="text-sm font-semibold text-brand-700 hover:underline">
        Kwitansi
      </Link>
    );
  }
  if (invoice.status === "dibatalkan") return null;

  const popoverId = `invoice-actions-${invoice.id}`;
  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        Kelola
      </button>
      {/* popover tampil di top layer sehingga tidak terpotong oleh tabel yang bisa di-scroll */}
      <div
        id={popoverId}
        popover="auto"
        className="m-auto w-[min(22rem,calc(100vw-2rem))] space-y-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-2xl backdrop:bg-stone-900/40"
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-stone-900">Kelola tagihan</p>
          <button
            type="button"
            popoverTarget={popoverId}
            popoverTargetAction="hide"
            className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          >
            Tutup
          </button>
        </div>
        <ActionForm action={recordPaymentAction} className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Catat pembayaran ({formatRupiah(invoice.amount)})</p>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <div className="grid grid-cols-2 gap-2">
            <Select name="method" defaultValue="tunai" aria-label="Metode">
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
            </Select>
            <Input name="paid_on" type="date" defaultValue={todayISO()} aria-label="Tanggal bayar" />
          </div>
          <Input name="note" placeholder="Catatan (opsional)" aria-label="Catatan" />
          <SubmitButton size="sm" className="w-full" confirm="Tandai tagihan ini lunas?">
            Tandai lunas
          </SubmitButton>
        </ActionForm>
        {invoice.status === "belum_bayar" && (
          <ActionForm action={sendReminderAction}>
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <SubmitButton size="sm" variant="outline" className="w-full">
              <BellRing className="size-4" /> Kirim pengingat WA/email
            </SubmitButton>
          </ActionForm>
        )}
        <ActionForm action={cancelInvoiceAction}>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <SubmitButton size="sm" variant="ghost" className="w-full text-red-600" confirm="Batalkan tagihan ini?">
            Batalkan tagihan
          </SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
