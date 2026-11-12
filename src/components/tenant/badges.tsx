import { Badge } from "@/components/ui/card";
import { addPeriod, formatDate, INVOICE_STATUS_LABEL, isOverdue } from "@/lib/format";
import type { ComplaintStatus, InvoiceStatus, PaymentMethod } from "@/lib/types";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "Transfer bank",
  qris: "QRIS",
  tunai: "Tunai",
};

/** Rentang periode tagihan untuk ditampilkan (period_end bersifat eksklusif). */
export function formatPeriodRange(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return `${formatDate(start)} – ${formatDate(addPeriod(end, "harian", -1))}`;
}

export function InvoiceStatusBadge({ invoice }: { invoice: { status: InvoiceStatus; due_date: string } }) {
  if (isOverdue(invoice)) return <Badge tone="red">Terlambat</Badge>;
  const tone = {
    belum_bayar: "yellow",
    menunggu_verifikasi: "blue",
    lunas: "green",
    dibatalkan: "gray",
  } as const;
  return <Badge tone={tone[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: "menunggu" | "diterima" | "ditolak" }) {
  if (status === "diterima") return <Badge tone="green">Diterima</Badge>;
  if (status === "ditolak") return <Badge tone="red">Ditolak</Badge>;
  return <Badge tone="yellow">Menunggu verifikasi</Badge>;
}

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  if (status === "selesai") return <Badge tone="green">Selesai</Badge>;
  if (status === "diproses") return <Badge tone="blue">Diproses</Badge>;
  return <Badge tone="yellow">Baru</Badge>;
}
