"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { formatRupiah, siteUrl, todayISO } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { isFile, removeFiles, uploadFile, validateFile } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { MAX_EXTEND_PERIODS } from "@/components/tenant/constants";
import type { ActionState } from "@/lib/types";

class ActionError extends Error {}

/** Pastikan yang memanggil adalah penghuni yang sedang login. */
async function assertTenant() {
  const current = await getCurrentUser();
  if (!current) throw new ActionError("Sesi Anda telah berakhir. Silakan login kembali.");
  if (current.profile.role !== "penghuni") throw new ActionError("Fitur ini khusus untuk penghuni.");
  return current;
}

async function tenantAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof z.ZodError) {
      return { message: err.issues[0]?.message ?? "Data tidak valid.", errors: z.flattenError(err).fieldErrors };
    }
    if (err instanceof ActionError) return { message: err.message };
    console.error("[tenant action]", err);
    return { message: err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi." };
  }
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function revalidatePortal() {
  revalidatePath("/penghuni", "layout");
  revalidatePath("/admin", "layout");
}

// ---------- Perpanjang / bayar di muka ----------

export async function extendTenancyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return tenantAction(async () => {
    const { user } = await assertTenant();
    const supabase = await createClient();

    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("id, period, status")
      .eq("id", str(formData, "tenancy_id"))
      .eq("tenant_id", user.id)
      .maybeSingle();
    if (!tenancy || tenancy.status !== "aktif") throw new ActionError("Masa sewa aktif tidak ditemukan.");

    const max = MAX_EXTEND_PERIODS[tenancy.period];
    const periods = z.coerce
      .number({ error: "Jumlah periode tidak valid" })
      .int("Jumlah periode harus bilangan bulat")
      .min(1, "Minimal 1 periode")
      .max(max, `Maksimal ${max} periode`)
      .safeParse(str(formData, "periods"));
    if (!periods.success) {
      const message = periods.error.issues[0]?.message ?? "Jumlah periode tidak valid";
      return { message, errors: { periods: [message] } };
    }

    const { data, error } = await supabase.rpc("extend_tenancy", { p_tenancy_id: tenancy.id, p_periods: periods.data });
    if (error || !data) throw new ActionError(`Gagal membuat tagihan perpanjangan: ${error?.message ?? "tidak diketahui"}`);

    revalidatePortal();
    redirect(`/penghuni/tagihan/${data}`);
  });
}

// ---------- Unggah bukti pembayaran ----------

const paymentSchema = z.object({
  invoice_id: z.uuid("Tagihan tidak valid"),
  method: z.enum(["transfer", "qris"], { error: "Pilih metode pembayaran" }),
  paid_on: z.iso
    .date("Tanggal bayar tidak valid")
    .refine((d) => d <= todayISO(), "Tanggal bayar tidak boleh di masa depan"),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export async function submitPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return tenantAction(async () => {
    const { user, profile } = await assertTenant();
    const parsed = paymentSchema.safeParse({
      invoice_id: str(formData, "invoice_id"),
      method: str(formData, "method"),
      paid_on: str(formData, "paid_on"),
      note: str(formData, "note") || undefined,
    });
    if (!parsed.success) return { message: "Periksa kembali isian Anda.", errors: z.flattenError(parsed.error).fieldErrors };
    const input = parsed.data;

    const proof = formData.get("proof");
    if (!isFile(proof)) return { message: "Bukti pembayaran wajib diunggah.", errors: { proof: ["Unggah foto/tangkapan layar bukti pembayaran"] } };
    const fileError = validateFile(proof);
    if (fileError) return { message: fileError, errors: { proof: [fileError] } };

    const supabase = await createClient();
    // RLS memastikan tagihan hanya terlihat oleh pemiliknya
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, number, description, amount, status, tenancies!inner(tenant_id, rooms(number))")
      .eq("id", input.invoice_id)
      .maybeSingle();
    if (!invoice || invoice.tenancies.tenant_id !== user.id) throw new ActionError("Tagihan tidak ditemukan.");
    if (invoice.status !== "belum_bayar") throw new ActionError("Tagihan ini tidak sedang menunggu pembayaran.");

    const path = await uploadFile("documents", `payments/${user.id}/${invoice.id}`, proof);
    const { error } = await supabase.rpc("submit_payment", {
      p_invoice_id: invoice.id,
      p_method: input.method,
      p_proof_path: path,
      p_paid_on: input.paid_on,
      p_note: input.note ?? undefined,
    });
    if (error) {
      await removeFiles("documents", [path]);
      throw new ActionError(`Gagal mengirim bukti pembayaran: ${error.message}`);
    }

    const settings = await getSettings();
    const tenantName = profile.full_name || profile.email || "Penghuni";
    const room = invoice.tenancies.rooms?.number;
    after(() =>
      notify({
        kind: "bukti_bayar_baru_admin",
        invoiceId: invoice.id,
        email: settings.email,
        phone: settings.whatsapp || null,
        subject: `Bukti pembayaran baru: ${invoice.number}`,
        text: [
          "Bukti pembayaran baru menunggu verifikasi.",
          `Penghuni: ${tenantName}${room ? ` (kamar ${room})` : ""}`,
          `Tagihan: ${invoice.number} - ${invoice.description}`,
          `Jumlah: ${formatRupiah(invoice.amount)}`,
          `Metode: ${input.method === "qris" ? "QRIS" : "Transfer bank"}`,
          "",
          `Verifikasi di: ${siteUrl("/admin/tagihan")}`,
        ].join("\n"),
      }),
    );

    revalidatePortal();
    revalidatePath(`/penghuni/tagihan/${invoice.id}`);
    return {
      ok: true,
      message: "Bukti pembayaran terkirim. Pengelola akan memverifikasinya secepatnya.",
    };
  });
}

// ---------- Keluhan ----------

const complaintSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(120, "Judul maksimal 120 karakter"),
  description: z.string().min(10, "Ceritakan keluhan minimal 10 karakter").max(2000, "Deskripsi maksimal 2000 karakter"),
});

export async function createComplaintAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return tenantAction(async () => {
    const { user, profile } = await assertTenant();
    const parsed = complaintSchema.safeParse({
      title: str(formData, "title"),
      description: str(formData, "description"),
    });
    if (!parsed.success) return { message: "Periksa kembali isian Anda.", errors: z.flattenError(parsed.error).fieldErrors };

    const photo = formData.get("photo");
    if (isFile(photo)) {
      const fileError = validateFile(photo);
      if (fileError) return { message: fileError, errors: { photo: [fileError] } };
    }

    const supabase = await createClient();
    const { data: tenancy } = await supabase
      .from("tenancies")
      .select("room_id, rooms(number)")
      .eq("tenant_id", user.id)
      .eq("status", "aktif")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const photoPath = isFile(photo) ? await uploadFile("documents", `complaints/${user.id}`, photo) : null;
    const { error } = await supabase.from("complaints").insert({
      tenant_id: user.id,
      room_id: tenancy?.room_id ?? null,
      title: parsed.data.title,
      description: parsed.data.description,
      photo_path: photoPath,
    });
    if (error) {
      await removeFiles("documents", [photoPath]);
      throw new ActionError(`Gagal mengirim keluhan: ${error.message}`);
    }

    const settings = await getSettings();
    const room = tenancy?.rooms?.number;
    after(() =>
      notify({
        kind: "keluhan_baru_admin",
        email: settings.email,
        phone: settings.whatsapp || null,
        subject: `Keluhan baru: ${parsed.data.title}`,
        text: [
          "Keluhan baru dari penghuni.",
          `Penghuni: ${profile.full_name || profile.email || "Penghuni"}${room ? ` (kamar ${room})` : ""}`,
          `Judul: ${parsed.data.title}`,
          parsed.data.description,
          photoPath ? "(dengan foto)" : "",
          "",
          `Tindak lanjuti di: ${siteUrl("/admin/keluhan")}`,
        ]
          .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
          .join("\n"),
      }),
    );

    revalidatePortal();
    return { ok: true, message: "Keluhan terkirim. Pengelola akan segera menindaklanjuti." };
  });
}

// ---------- Profil ----------

const profileSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{8,20}$/, "Nomor HP tidak valid")
    .nullable(),
  address: z.string().max(300, "Alamat maksimal 300 karakter").nullable(),
});

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return tenantAction(async () => {
    const { user } = await assertTenant();
    const parsed = profileSchema.safeParse({
      full_name: str(formData, "full_name"),
      phone: str(formData, "phone") || null,
      address: str(formData, "address") || null,
    });
    if (!parsed.success) return { message: "Periksa kembali isian Anda.", errors: z.flattenError(parsed.error).fieldErrors };

    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
    if (error) throw new ActionError(`Gagal menyimpan profil: ${error.message}`);

    revalidatePortal();
    return { ok: true, message: "Profil berhasil disimpan." };
  });
}
