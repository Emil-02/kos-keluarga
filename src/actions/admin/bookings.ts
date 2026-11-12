"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminAction, check, must, generateTempPassword, optStr, randomString, str } from "@/lib/admin-action";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/public";
import { notify, PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/notifications";
import { bookingApprovedText, bookingRejectedText } from "@/lib/notifications/templates";
import { isFile, uploadFile, validateFile } from "@/lib/storage";
import { setFlash } from "@/lib/flash";
import { normalizePhone } from "@/lib/format";
import type { ActionState } from "@/lib/types";

/** Cari akun penghuni berdasarkan email, atau buat akun baru dengan password sementara. */
async function findOrCreateTenantAccount(email: string, fullName: string, phone: string) {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: existing } = await admin.from("profiles").select("id, role").eq("email", normalizedEmail).maybeSingle();
  if (existing) {
    if (existing.role === "admin") throw new Error("Email tersebut milik akun admin. Gunakan email lain untuk penghuni.");
    return { tenantId: existing.id, tempPassword: null as string | null, created: false };
  }

  const tempPassword = generateTempPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });
  if (error || !data.user) throw new Error(`Gagal membuat akun penghuni: ${error?.message}`);
  return { tenantId: data.user.id, tempPassword, created: true };
}

/** Setujui booking: buat akun (jika belum ada), masa sewa, tagihan pertama, lalu kirim notifikasi. */
async function approveBooking(bookingId: string, roomId: string, adminNote: string | null) {
  const supabase = await createClient();
  const booking = must(
    await supabase.from("bookings").select("*").eq("id", bookingId).single(),
    "Booking tidak ditemukan",
  );
  if (booking.status !== "menunggu") throw new Error("Booking ini sudah diproses.");

  const account = await findOrCreateTenantAccount(booking.email, booking.full_name, booking.phone);

  const { data: tenancyId, error } = await supabase.rpc("approve_booking", {
    p_booking_id: booking.id,
    p_room_id: roomId,
    p_tenant_id: account.tenantId,
    p_admin_note: adminNote ?? undefined,
  });
  if (error || !tenancyId) {
    if (account.created) await createAdminClient().auth.admin.deleteUser(account.tenantId);
    throw new Error(error?.message ?? "Gagal menyetujui booking.");
  }

  const [settings, { data: invoices }, { data: room }] = await Promise.all([
    getSettings(),
    supabase.from("invoices").select("number, description, amount, due_date").eq("tenancy_id", tenancyId).order("created_at"),
    supabase.from("rooms").select("number").eq("id", roomId).single(),
  ]);

  const text = bookingApprovedText(settings, {
    fullName: booking.full_name,
    roomNumber: room?.number ?? "-",
    email: booking.email.toLowerCase(),
    tempPassword: account.tempPassword,
    invoices: invoices ?? [],
  });
  await notify({
    kind: "booking_disetujui",
    email: booking.email,
    phone: booking.phone,
    subject: `Booking disetujui - ${settings.kos_name}`,
    text,
  });

  revalidatePath("/admin", "layout");
  return { tenancyId, tempPassword: account.tempPassword, email: booking.email.toLowerCase() };
}

export async function approveBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let tenancyId: string | null = null;
  const result = await adminAction(async () => {
    const roomId = str(formData, "room_id");
    if (!roomId) throw new Error("Pilih kamar terlebih dahulu.");
    const res = await approveBooking(str(formData, "booking_id"), roomId, optStr(formData, "admin_note"));
    tenancyId = res.tenancyId;
    await setFlash(
      res.tempPassword
        ? `Booking disetujui. Akun portal penghuni — email: ${res.email}, password sementara: ${res.tempPassword} (sudah dikirim ke penghuni via WhatsApp/email).`
        : "Booking disetujui. Penghuni memakai akun portal yang sudah ada.",
    );
  });
  if (result.ok && tenancyId) redirect(`/admin/penghuni/${tenancyId}`);
  return result;
}

export async function rejectBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const status = str(formData, "status") === "dibatalkan" ? "dibatalkan" : "ditolak";
    const note = optStr(formData, "admin_note");
    const booking = check(
      await supabase
        .from("bookings")
        .update({ status, admin_note: note, decided_at: new Date().toISOString() })
        .eq("id", str(formData, "booking_id"))
        .eq("status", "menunggu")
        .select("code, full_name, email, phone")
        .maybeSingle(),
    );
    if (!booking) throw new Error("Booking tidak ditemukan atau sudah diproses.");

    if (status === "ditolak") {
      const settings = await getSettings();
      await notify({
        kind: "booking_ditolak",
        email: booking.email,
        phone: booking.phone,
        subject: `Status booking ${booking.code} - ${settings.kos_name}`,
        text: bookingRejectedText(settings, { fullName: booking.full_name, code: booking.code, reason: note }),
      });
    }
    revalidatePath("/admin", "layout");
    const message = status === "ditolak" ? "Booking ditolak dan pemesan sudah diberi tahu." : "Booking dibatalkan.";
    // form tolak hilang setelah status berubah, jadi pesan ditampilkan lewat flash
    await setFlash(message);
    return { ok: true, message };
  });
}

const manualTenantSchema = z.object({
  full_name: z.string().min(2, "Nama wajib diisi"),
  phone: z.string().regex(/^(\+?62|0)8\d{7,13}$/, "Nomor HP tidak valid (contoh: 081234567890)"),
  email: z.union([z.literal(""), z.email("Email tidak valid")]),
  period: z.enum(["harian", "mingguan", "bulanan"]),
  start_date: z.iso.date("Tanggal tidak valid"),
  duration: z.coerce.number().int().min(1).max(365),
  room_id: z.uuid("Pilih kamar"),
});

/** Admin menambahkan penghuni secara langsung (mis. penghuni lama / datang langsung). */
export async function createTenantManualAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let tenancyId: string | null = null;
  const result = await adminAction(async () => {
    const data = manualTenantSchema.parse({
      full_name: str(formData, "full_name"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      period: str(formData, "period"),
      start_date: str(formData, "start_date"),
      duration: str(formData, "duration"),
      room_id: str(formData, "room_id"),
    });

    const email = data.email || `hp${normalizePhone(data.phone)}${PLACEHOLDER_EMAIL_DOMAIN}`;

    let idCardPath: string | null = null;
    const ktp = formData.get("ktp");
    if (isFile(ktp)) {
      const err = validateFile(ktp, { allowPdf: true });
      if (err) throw new Error(err);
      idCardPath = await uploadFile("documents", "ktp/manual", ktp);
    }

    const supabase = await createClient();
    const booking = must(
      await supabase
        .from("bookings")
        .insert({
          code: `KK-${randomString(6)}`,
          full_name: data.full_name,
          phone: data.phone,
          email,
          period: data.period,
          start_date: data.start_date,
          duration: data.duration,
          id_card_path: idCardPath,
          note: "Ditambahkan manual oleh admin",
        })
        .select("id")
        .single(),
    );

    try {
      const res = await approveBooking(booking.id, data.room_id, "Ditambahkan manual oleh admin");
      tenancyId = res.tenancyId;
      await setFlash(
        res.tempPassword
          ? `Penghuni ditambahkan. Akun portal — email: ${res.email}, password sementara: ${res.tempPassword}. Jika sudah dibayar, catat lewat menu "Kelola → Tandai lunas" pada tagihan.`
          : "Penghuni ditambahkan ke akun portal yang sudah ada.",
      );
    } catch (err) {
      await supabase.from("bookings").delete().eq("id", booking.id);
      throw err;
    }
  });
  if (result.ok && tenancyId) redirect(`/admin/penghuni/${tenancyId}`);
  return result;
}
