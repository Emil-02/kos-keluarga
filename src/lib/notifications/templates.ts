import "server-only";
import { formatDate, formatRupiah, siteUrl } from "@/lib/format";
import type { Settings } from "@/lib/types";

type InvoiceLike = {
  number: string;
  description: string;
  amount: number;
  due_date: string;
};

function paymentInfo(settings: Settings) {
  const lines = ["Pembayaran dapat dilakukan melalui:"];
  if (settings.bank_name && settings.bank_account_number) {
    lines.push(`• Transfer ${settings.bank_name} ${settings.bank_account_number} a.n. ${settings.bank_account_name ?? "-"}`);
  }
  if (settings.qris_path) lines.push("• QRIS (lihat di portal penghuni)");
  lines.push(`Setelah membayar, unggah bukti di ${siteUrl("/penghuni/tagihan")}`);
  return lines.join("\n");
}

export function bookingReceivedText(settings: Settings, booking: { code: string; full_name: string }) {
  return [
    `Halo ${booking.full_name},`,
    "",
    `Terima kasih telah melakukan booking di ${settings.kos_name}.`,
    `Kode booking Anda: ${booking.code}`,
    "",
    "Pengelola akan memeriksa ketersediaan dan menghubungi Anda segera.",
    `Cek status booking: ${siteUrl(`/booking/${booking.code}`)}`,
  ].join("\n");
}

export function newBookingAdminText(booking: {
  code: string;
  full_name: string;
  phone: string;
  period: string;
  start_date: string;
  duration: number;
}) {
  return [
    `Booking baru masuk (${booking.code})`,
    `Nama: ${booking.full_name}`,
    `HP: ${booking.phone}`,
    `Sewa: ${booking.duration}x ${booking.period}, mulai ${formatDate(booking.start_date)}`,
    "",
    `Proses di: ${siteUrl("/admin/booking")}`,
  ].join("\n");
}

export function bookingApprovedText(
  settings: Settings,
  params: {
    fullName: string;
    roomNumber: string;
    email: string;
    tempPassword: string | null;
    invoices: InvoiceLike[];
  },
) {
  const total = params.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  return [
    `Halo ${params.fullName},`,
    "",
    `Booking Anda di ${settings.kos_name} telah DISETUJUI. Kamar Anda: ${params.roomNumber}.`,
    "",
    "Tagihan yang perlu dibayar:",
    ...params.invoices.map((inv) => `• ${inv.description}: ${formatRupiah(inv.amount)} (jatuh tempo ${formatDate(inv.due_date)})`),
    `Total: ${formatRupiah(total)}`,
    "",
    paymentInfo(settings),
    "",
    "Akun portal penghuni Anda:",
    `Login: ${siteUrl("/login")}`,
    `Email: ${params.email}`,
    params.tempPassword
      ? `Password sementara: ${params.tempPassword}\n(Segera ganti password setelah login.)`
      : "Gunakan password akun Anda yang sudah ada.",
  ].join("\n");
}

export function bookingRejectedText(settings: Settings, params: { fullName: string; code: string; reason?: string | null }) {
  return [
    `Halo ${params.fullName},`,
    "",
    `Mohon maaf, booking ${params.code} di ${settings.kos_name} belum dapat kami terima.`,
    params.reason ? `Keterangan: ${params.reason}` : "",
    "",
    `Silakan hubungi kami via WhatsApp ${settings.whatsapp} untuk informasi lebih lanjut.`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export function newInvoiceText(settings: Settings, fullName: string, invoice: InvoiceLike) {
  return [
    `Halo ${fullName},`,
    "",
    `Tagihan baru dari ${settings.kos_name}:`,
    `No: ${invoice.number}`,
    `${invoice.description}`,
    `Jumlah: ${formatRupiah(invoice.amount)}`,
    `Jatuh tempo: ${formatDate(invoice.due_date)}`,
    "",
    paymentInfo(settings),
  ].join("\n");
}

export function reminderText(settings: Settings, fullName: string, invoice: InvoiceLike, daysLeft: number) {
  const when =
    daysLeft > 0
      ? `akan jatuh tempo dalam ${daysLeft} hari (${formatDate(invoice.due_date)})`
      : daysLeft === 0
        ? "jatuh tempo HARI INI"
        : `sudah TERLAMBAT ${Math.abs(daysLeft)} hari (jatuh tempo ${formatDate(invoice.due_date)})`;
  return [
    `Halo ${fullName},`,
    "",
    `Pengingat dari ${settings.kos_name}: tagihan ${invoice.number} (${invoice.description}) sebesar ${formatRupiah(invoice.amount)} ${when}.`,
    "",
    paymentInfo(settings),
    "",
    "Abaikan pesan ini jika Anda sudah membayar. Terima kasih 🙏",
  ].join("\n");
}

export function paymentVerifiedText(settings: Settings, fullName: string, invoice: InvoiceLike, approved: boolean, note?: string | null) {
  return approved
    ? [
        `Halo ${fullName},`,
        "",
        `Pembayaran tagihan ${invoice.number} (${invoice.description}) sebesar ${formatRupiah(invoice.amount)} telah DITERIMA. Terima kasih!`,
        `Kwitansi: ${siteUrl("/penghuni/tagihan")}`,
        "",
        `— ${settings.kos_name}`,
      ].join("\n")
    : [
        `Halo ${fullName},`,
        "",
        `Bukti pembayaran untuk tagihan ${invoice.number} belum dapat kami terima.`,
        note ? `Alasan: ${note}` : "",
        `Silakan unggah ulang bukti yang benar di ${siteUrl("/penghuni/tagihan")}`,
        "",
        `— ${settings.kos_name}`,
      ].join("\n");
}

export function announcementText(settings: Settings, title: string, body: string) {
  return [`📢 ${title}`, "", body, "", `— Pengelola ${settings.kos_name}`].join("\n");
}

export function complaintUpdateText(settings: Settings, fullName: string, title: string, status: string, response?: string | null) {
  return [
    `Halo ${fullName},`,
    "",
    `Laporan "${title}" sekarang berstatus: ${status.toUpperCase()}.`,
    response ? `Tanggapan pengelola: ${response}` : "",
    "",
    `— ${settings.kos_name}`,
  ].join("\n");
}
