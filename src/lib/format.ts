import type { InvoiceStatus, RentPeriod } from "@/lib/types";

const TZ = "Asia/Jakarta";

export function formatRupiah(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

/** Tanggal hari ini (WIB) dalam format YYYY-MM-DD. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function parseDate(value: string | Date) {
  if (value instanceof Date) return value;
  // tanggal murni (YYYY-MM-DD) diperlakukan sebagai tengah hari UTC agar tidak bergeser
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}

export function formatDate(value: string | Date | null | undefined, opts?: { short?: boolean }) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: opts?.short ? "short" : "long",
    year: "numeric",
  }).format(parseDate(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parseDate(value));
}

/** Menambah n periode ke tanggal YYYY-MM-DD (sama dengan fungsi SQL period_add). */
export function addPeriod(dateISO: string, period: RentPeriod, n: number) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  if (period === "harian") d.setUTCDate(d.getUTCDate() + n);
  else if (period === "mingguan") d.setUTCDate(d.getUTCDate() + n * 7);
  else {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Batas periode ke-n setelah `fromISO`, dihitung dari tanggal mulai sewa (sama dengan
 * fungsi SQL period_end_after) agar sewa bulanan tgl 29-31 tidak bergeser.
 */
export function periodEndAfter(anchorISO: string, period: RentPeriod, fromISO: string, count: number) {
  if (period !== "bulanan") return addPeriod(fromISO, period, count);
  const [ay, am] = anchorISO.split("-").map(Number);
  const [fy, fm] = fromISO.split("-").map(Number);
  let k = Math.max((fy - ay) * 12 + fm - am - 1, 0);
  while (addPeriod(anchorISO, period, k) <= fromISO) k++;
  return addPeriod(anchorISO, period, k + count - 1);
}

export function daysBetween(fromISO: string, toISO: string) {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const PERIOD_LABEL: Record<RentPeriod, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export const PERIOD_UNIT: Record<RentPeriod, string> = {
  harian: "hari",
  mingguan: "minggu",
  bulanan: "bulan",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  belum_bayar: "Belum dibayar",
  menunggu_verifikasi: "Menunggu verifikasi",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
};

export function isOverdue(invoice: { status: InvoiceStatus; due_date: string }) {
  return invoice.status === "belum_bayar" && invoice.due_date < todayISO();
}

/** Normalisasi nomor HP Indonesia ke format 62xxxx untuk WhatsApp. */
export function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  if (p.startsWith("8")) p = `62${p}`;
  return p;
}

export function whatsappLink(phone: string, text?: string) {
  const base = `https://wa.me/${normalizePhone(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function publicImageUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-images/${path}`;
}
