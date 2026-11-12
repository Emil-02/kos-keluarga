import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { newInvoiceText, reminderText } from "@/lib/notifications/templates";
import { daysBetween, todayISO } from "@/lib/format";

/** Hari (relatif jatuh tempo) kapan pengingat dikirim. Negatif = sudah terlambat. */
const REMINDER_DAYS = new Set([3, 1, 0]);
const OVERDUE_EVERY_DAYS = 3;
const OVERDUE_MAX_DAYS = 30;

type InvoiceWithTenant = {
  id: string;
  number: string;
  description: string;
  amount: number;
  due_date: string;
  tenancies: { status: string; profiles: { full_name: string; email: string | null; phone: string | null } | null } | null;
};

const INVOICE_SELECT =
  "id, number, description, amount, due_date, tenancies!inner(status, profiles!tenancies_tenant_id_fkey(full_name, email, phone))";

/**
 * Tugas harian: buat tagihan periode berikutnya, kirim notifikasi tagihan baru,
 * dan kirim pengingat jatuh tempo / keterlambatan. Aman dijalankan berulang kali.
 */
export async function runDailyBilling() {
  const supabase = createAdminClient();
  const { data: settings, error: settingsError } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (settingsError || !settings) throw new Error("Pengaturan tidak ditemukan");

  // 1. Tagihan berulang
  const { data: newIds, error: genError } = await supabase.rpc("generate_recurring_invoices");
  if (genError) throw new Error(`Gagal membuat tagihan: ${genError.message}`);
  const createdIds = (newIds ?? []) as string[];

  if (createdIds.length > 0) {
    const { data: created } = await supabase.from("invoices").select(INVOICE_SELECT).in("id", createdIds);
    for (const inv of (created ?? []) as unknown as InvoiceWithTenant[]) {
      const tenant = inv.tenancies?.profiles;
      if (!tenant) continue;
      await notify({
        kind: "tagihan_baru",
        invoiceId: inv.id,
        email: tenant.email,
        phone: tenant.phone,
        subject: `Tagihan baru ${inv.number} - ${settings.kos_name}`,
        text: newInvoiceText(settings, tenant.full_name, inv),
      });
    }
  }

  // 2. Pengingat
  const today = todayISO();
  const { data: unpaid } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("status", "belum_bayar")
    .eq("tenancies.status", "aktif");

  let reminders = 0;
  for (const inv of (unpaid ?? []) as unknown as InvoiceWithTenant[]) {
    const tenant = inv.tenancies?.profiles;
    if (!tenant) continue;

    const daysLeft = daysBetween(today, inv.due_date);
    const shouldRemind =
      REMINDER_DAYS.has(daysLeft) ||
      (daysLeft < 0 && -daysLeft <= OVERDUE_MAX_DAYS && -daysLeft % OVERDUE_EVERY_DAYS === 0);
    if (!shouldRemind) continue;

    const kind = daysLeft >= 0 ? `pengingat_h-${daysLeft}` : `terlambat_${-daysLeft}`;
    const { count } = await supabase
      .from("notifications_log")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", inv.id)
      .eq("kind", kind);
    if ((count ?? 0) > 0) continue;

    await notify({
      kind,
      invoiceId: inv.id,
      email: tenant.email,
      phone: tenant.phone,
      subject:
        daysLeft >= 0
          ? `Pengingat pembayaran ${inv.number} - ${settings.kos_name}`
          : `Tagihan ${inv.number} terlambat - ${settings.kos_name}`,
      text: reminderText(settings, tenant.full_name, inv, daysLeft),
    });
    reminders++;
  }

  return { invoicesCreated: createdIds.length, remindersSent: reminders };
}
