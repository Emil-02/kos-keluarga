"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, check, must, generateTempPassword, optStr, str } from "@/lib/admin-action";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/public";
import { notify } from "@/lib/notifications";
import { newInvoiceText, paymentVerifiedText, reminderText } from "@/lib/notifications/templates";
import { runDailyBilling } from "@/lib/billing";
import { setFlash } from "@/lib/flash";
import { daysBetween, siteUrl, todayISO } from "@/lib/format";
import type { ActionState } from "@/lib/types";

function revalidateTenancy(tenancyId?: string | null) {
  revalidatePath("/admin", "layout");
  if (tenancyId) revalidatePath(`/admin/penghuni/${tenancyId}`);
}

/** Data tagihan + penghuni untuk notifikasi. */
async function getInvoiceWithTenant(invoiceId: string) {
  const supabase = await createClient();
  return must(
    await supabase
      .from("invoices")
      .select("id, number, description, amount, due_date, status, tenancy_id, tenancies!inner(profiles!tenancies_tenant_id_fkey(full_name, email, phone))")
      .eq("id", invoiceId)
      .single(),
    "Tagihan tidak ditemukan",
  );
}

export async function checkoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const tenancyId = str(formData, "tenancy_id");
    const date = z.iso.date("Tanggal check-out tidak valid").parse(str(formData, "date"));
    const supabase = await createClient();
    const { error } = await supabase.rpc("checkout_tenancy", { p_tenancy_id: tenancyId, p_date: date });
    if (error) throw new Error(error.message);
    revalidateTenancy(tenancyId);
    return { ok: true, message: "Check-out berhasil. Kamar kembali tersedia mulai tanggal tersebut." };
  });
}

export async function adminExtendAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const tenancyId = str(formData, "tenancy_id");
    const periods = z.coerce.number().int().min(1, "Minimal 1").max(60).parse(str(formData, "periods"));
    const supabase = await createClient();
    const { data: invoiceId, error } = await supabase.rpc("extend_tenancy", { p_tenancy_id: tenancyId, p_periods: periods });
    if (error || !invoiceId) throw new Error(error?.message ?? "Gagal memperpanjang");

    if (formData.get("notify") === "on") await sendNewInvoiceNotification(invoiceId);
    revalidateTenancy(tenancyId);
    return { ok: true, message: "Tagihan perpanjangan dibuat." };
  });
}

const tenancyUpdateSchema = z.object({
  price: z.coerce.number().int().min(1000, "Harga tidak valid"),
  auto_renew: z.boolean(),
  notes: z.string().max(1000).nullable(),
});

export async function updateTenancyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const tenancyId = str(formData, "tenancy_id");
    const data = tenancyUpdateSchema.parse({
      price: str(formData, "price"),
      auto_renew: formData.get("auto_renew") === "on",
      notes: optStr(formData, "notes"),
    });
    const supabase = await createClient();
    check(await supabase.from("tenancies").update(data).eq("id", tenancyId).eq("status", "aktif"));
    revalidateTenancy(tenancyId);
    return { ok: true, message: "Data sewa diperbarui. Harga baru berlaku untuk tagihan berikutnya." };
  });
}

export async function updateTenantProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const fullName = str(formData, "full_name");
    if (fullName.length < 2) throw new Error("Nama wajib diisi");
    check(
      await supabase
        .from("profiles")
        .update({ full_name: fullName, phone: optStr(formData, "phone"), address: optStr(formData, "address") })
        .eq("id", str(formData, "profile_id")),
    );
    revalidateTenancy(optStr(formData, "tenancy_id"));
    return { ok: true, message: "Profil penghuni diperbarui." };
  });
}

export async function resetTenantPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const profileId = str(formData, "profile_id");
    const supabase = await createClient();
    const profile = must(
      await supabase.from("profiles").select("id, role, full_name, email, phone").eq("id", profileId).single(),
      "Penghuni tidak ditemukan",
    );
    if (profile.role === "admin") throw new Error("Tidak dapat mereset password admin dari sini.");

    const tempPassword = generateTempPassword();
    const { error } = await createAdminClient().auth.admin.updateUserById(profile.id, { password: tempPassword });
    if (error) throw new Error(error.message);

    const settings = await getSettings();
    await notify({
      kind: "reset_password",
      email: profile.email,
      phone: profile.phone,
      subject: `Password baru portal penghuni - ${settings.kos_name}`,
      text: `Halo ${profile.full_name},\n\nPassword portal penghuni Anda telah direset oleh pengelola.\nLogin: ${siteUrl("/login")}\nEmail: ${profile.email}\nPassword sementara: ${tempPassword}\n\nSegera ganti password setelah login.`,
    });
    return { ok: true, message: `Password direset. Password sementara: ${tempPassword} (juga dikirim ke penghuni).` };
  });
}

const invoiceSchema = z.object({
  type: z.enum(["listrik", "denda", "lainnya", "deposit", "sewa"]),
  description: z.string().min(3, "Keterangan wajib diisi").max(200),
  amount: z.coerce.number().int().min(1000, "Nominal minimal Rp1.000"),
  due_date: z.iso.date("Tanggal jatuh tempo tidak valid"),
});

export async function createInvoiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const tenancyId = str(formData, "tenancy_id");
    const data = invoiceSchema.parse({
      type: str(formData, "type"),
      description: str(formData, "description"),
      amount: str(formData, "amount"),
      due_date: str(formData, "due_date"),
    });
    if (data.type === "sewa") throw new Error("Gunakan fitur perpanjangan untuk tagihan sewa.");

    const supabase = await createClient();
    const invoice = must(
      await supabase
        .from("invoices")
        .insert({ tenancy_id: tenancyId, ...data })
        .select("id")
        .single(),
    );
    if (formData.get("notify") === "on") await sendNewInvoiceNotification(invoice.id);
    revalidateTenancy(tenancyId);
    return { ok: true, message: "Tagihan dibuat." };
  });
}

async function sendNewInvoiceNotification(invoiceId: string) {
  const inv = await getInvoiceWithTenant(invoiceId);
  const tenant = inv.tenancies.profiles;
  if (!tenant) return;
  const settings = await getSettings();
  await notify({
    kind: "tagihan_baru",
    invoiceId: inv.id,
    email: tenant.email,
    phone: tenant.phone,
    subject: `Tagihan baru ${inv.number} - ${settings.kos_name}`,
    text: newInvoiceText(settings, tenant.full_name, inv),
  });
}

export async function cancelInvoiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const invoice = check(
      await supabase
        .from("invoices")
        .update({ status: "dibatalkan" })
        .eq("id", str(formData, "invoice_id"))
        .in("status", ["belum_bayar", "menunggu_verifikasi"])
        .select("tenancy_id")
        .maybeSingle(),
    );
    if (!invoice) throw new Error("Tagihan tidak dapat dibatalkan.");
    await supabase
      .from("payments")
      .update({ status: "ditolak", admin_note: "Tagihan dibatalkan" })
      .eq("invoice_id", str(formData, "invoice_id"))
      .eq("status", "menunggu");
    revalidateTenancy(invoice.tenancy_id);
    await setFlash("Tagihan dibatalkan.");
    return { ok: true, message: "Tagihan dibatalkan." };
  });
}

export async function recordPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const invoiceId = str(formData, "invoice_id");
    const method = z.enum(["tunai", "transfer", "qris"]).parse(str(formData, "method") || "tunai");
    const paidOn = z.iso.date().parse(str(formData, "paid_on") || todayISO());
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_payment", {
      p_invoice_id: invoiceId,
      p_method: method,
      p_paid_on: paidOn,
      p_note: optStr(formData, "note") ?? undefined,
    });
    if (error) throw new Error(error.message);
    const inv = await getInvoiceWithTenant(invoiceId);
    revalidateTenancy(inv.tenancy_id);
    await setFlash(`Pembayaran ${inv.number} dicatat lunas.`);
    return { ok: true, message: `Pembayaran ${inv.number} dicatat lunas.` };
  });
}

export async function verifyPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const paymentId = str(formData, "payment_id");
    const approve = str(formData, "decision") === "terima";
    const note = optStr(formData, "admin_note");
    if (!approve && !note) throw new Error("Tuliskan alasan penolakan agar penghuni tahu apa yang harus diperbaiki.");

    const supabase = await createClient();
    const payment = must(
      await supabase.from("payments").select("invoice_id").eq("id", paymentId).single(),
      "Pembayaran tidak ditemukan",
    );
    const { error } = await supabase.rpc("verify_payment", {
      p_payment_id: paymentId,
      p_approve: approve,
      p_admin_note: note ?? undefined,
    });
    if (error) throw new Error(error.message);

    const inv = await getInvoiceWithTenant(payment.invoice_id);
    const tenant = inv.tenancies.profiles;
    if (tenant) {
      const settings = await getSettings();
      await notify({
        kind: approve ? "pembayaran_diterima" : "pembayaran_ditolak",
        invoiceId: inv.id,
        email: tenant.email,
        phone: tenant.phone,
        subject: `${approve ? "Pembayaran diterima" : "Bukti pembayaran ditolak"} - ${inv.number}`,
        text: paymentVerifiedText(settings, tenant.full_name, inv, approve, note),
      });
    }
    revalidateTenancy(inv.tenancy_id);
    const message = approve
      ? `Pembayaran ${inv.number} (${tenant?.full_name ?? "-"}) diterima dan ditandai lunas.`
      : `Bukti pembayaran ${inv.number} ditolak; penghuni diminta mengunggah ulang.`;
    // kartu verifikasi hilang setelah diproses, jadi pesan ditampilkan lewat flash di layout
    await setFlash(message);
    return { ok: true, message };
  });
}

export async function sendReminderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const inv = await getInvoiceWithTenant(str(formData, "invoice_id"));
    const tenant = inv.tenancies.profiles;
    if (!tenant) throw new Error("Data penghuni tidak ditemukan.");
    if (inv.status !== "belum_bayar") throw new Error("Tagihan ini tidak menunggu pembayaran.");
    const settings = await getSettings();
    await notify({
      kind: "pengingat_manual",
      invoiceId: inv.id,
      email: tenant.email,
      phone: tenant.phone,
      subject: `Pengingat pembayaran ${inv.number} - ${settings.kos_name}`,
      text: reminderText(settings, tenant.full_name, inv, daysBetween(todayISO(), inv.due_date)),
    });
    return { ok: true, message: `Pengingat dikirim ke ${tenant.full_name}. Cek log notifikasi di Pengaturan bila tidak sampai.` };
  });
}

export async function runBillingNowAction(): Promise<ActionState> {
  return adminAction(async () => {
    const result = await runDailyBilling();
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: `Selesai: ${result.invoicesCreated} tagihan baru dibuat, ${result.remindersSent} pengingat dikirim.`,
    };
  });
}
