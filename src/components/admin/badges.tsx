import { Badge } from "@/components/ui/card";
import { INVOICE_STATUS_LABEL, isOverdue } from "@/lib/format";
import type { BookingStatus, ComplaintStatus, InvoiceStatus } from "@/lib/types";

export function InvoiceStatusBadge({ invoice }: { invoice: { status: InvoiceStatus; due_date: string } }) {
  if (isOverdue(invoice)) return <Badge tone="red">Terlambat</Badge>;
  const tone = { belum_bayar: "yellow", menunggu_verifikasi: "blue", lunas: "green", dibatalkan: "gray" } as const;
  return <Badge tone={tone[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map = {
    menunggu: ["yellow", "Menunggu"],
    disetujui: ["green", "Disetujui"],
    ditolak: ["red", "Ditolak"],
    dibatalkan: ["gray", "Dibatalkan"],
  } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const map = { baru: ["yellow", "Baru"], diproses: ["blue", "Diproses"], selesai: ["green", "Selesai"] } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: "menunggu" | "diterima" | "ditolak" }) {
  const map = { menunggu: ["blue", "Menunggu verifikasi"], diterima: ["green", "Diterima"], ditolak: ["red", "Ditolak"] } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const PAYMENT_METHOD_LABEL = { transfer: "Transfer bank", qris: "QRIS", tunai: "Tunai" } as const;

export const INVOICE_TYPE_LABEL = {
  sewa: "Sewa",
  deposit: "Deposit",
  listrik: "Listrik",
  denda: "Denda",
  lainnya: "Lainnya",
} as const;
