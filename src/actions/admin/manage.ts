"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction, check, must, optStr, revalidatePublic, str } from "@/lib/admin-action";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/public";
import { notify } from "@/lib/notifications";
import { announcementText, complaintUpdateText } from "@/lib/notifications/templates";
import { isFile, removeFiles, uploadFile, validateFile } from "@/lib/storage";
import { setFlash } from "@/lib/flash";
import type { ActionState } from "@/lib/types";

// ---------- Kamar ----------
const roomSchema = z.object({
  number: z.string().min(1, "Nomor kamar wajib diisi").max(20),
  floor: z.coerce.number().int().min(0).max(50),
  status: z.enum(["aktif", "perbaikan"]),
  notes: z.string().max(500).nullable(),
});

function parseRoom(formData: FormData) {
  return roomSchema.parse({
    number: str(formData, "number"),
    floor: str(formData, "floor") || "1",
    status: str(formData, "status") || "aktif",
    notes: optStr(formData, "notes"),
  });
}

function friendlyRoomError(message: string) {
  return message.includes("duplicate") ? "Nomor kamar sudah dipakai." : message;
}

export async function createRoomAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("rooms").insert(parseRoom(formData));
    if (error) throw new Error(friendlyRoomError(error.message));
    revalidatePath("/admin/kamar");
    revalidatePublic();
    return { ok: true, message: "Kamar ditambahkan." };
  });
}

export async function updateRoomAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("rooms").update(parseRoom(formData)).eq("id", str(formData, "id"));
    if (error) throw new Error(friendlyRoomError(error.message));
    revalidatePath("/admin/kamar");
    revalidatePublic();
    return { ok: true, message: "Kamar diperbarui." };
  });
}

export async function deleteRoomAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const { error } = await supabase.from("rooms").delete().eq("id", str(formData, "id"));
    if (error) {
      throw new Error(
        error.message.includes("foreign key")
          ? "Kamar memiliki riwayat sewa sehingga tidak bisa dihapus. Ubah statusnya menjadi 'perbaikan' jika tidak dipakai."
          : error.message,
      );
    }
    revalidatePath("/admin/kamar");
    revalidatePublic();
    await setFlash("Kamar dihapus.");
    return { ok: true, message: "Kamar dihapus." };
  });
}

// ---------- Keluhan ----------
export async function updateComplaintAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const status = z.enum(["baru", "diproses", "selesai"]).parse(str(formData, "status"));
    const response = optStr(formData, "admin_response");
    const supabase = await createClient();
    const complaint = must(
      await supabase
        .from("complaints")
        .update({ status, admin_response: response, updated_at: new Date().toISOString() })
        .eq("id", str(formData, "id"))
        .select("title, profiles!complaints_tenant_id_fkey(full_name, email, phone)")
        .single(),
    );

    if (formData.get("notify") === "on" && complaint.profiles) {
      const settings = await getSettings();
      await notify({
        kind: "keluhan_update",
        email: complaint.profiles.email,
        phone: complaint.profiles.phone,
        subject: `Update laporan "${complaint.title}" - ${settings.kos_name}`,
        text: complaintUpdateText(settings, complaint.profiles.full_name, complaint.title, status, response),
      });
    }
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Laporan diperbarui." };
  });
}

// ---------- Pengumuman ----------
export async function createAnnouncementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const title = str(formData, "title");
    const body = str(formData, "body");
    if (title.length < 3) throw new Error("Judul minimal 3 karakter.");
    if (body.length < 5) throw new Error("Isi pengumuman terlalu pendek.");
    const send = formData.get("notify") === "on";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    check(
      await supabase.from("announcements").insert({ title, body, sent_notification: send, created_by: user?.id ?? null }),
    );

    let recipients = 0;
    if (send) {
      const settings = await getSettings();
      const { data: tenants } = await supabase
        .from("tenancies")
        .select("profiles!tenancies_tenant_id_fkey(id, full_name, email, phone)")
        .eq("status", "aktif");
      const unique = new Map<string, { email: string | null; phone: string | null }>();
      tenants?.forEach((t) => t.profiles && unique.set(t.profiles.id, t.profiles));
      const text = announcementText(settings, title, body);
      for (const tenant of unique.values()) {
        await notify({ kind: "pengumuman", email: tenant.email, phone: tenant.phone, subject: `[Pengumuman] ${title}`, text });
      }
      recipients = unique.size;
    }
    revalidatePath("/admin/pengumuman");
    revalidatePath("/penghuni", "layout");
    return { ok: true, message: send ? `Pengumuman diterbitkan dan dikirim ke ${recipients} penghuni.` : "Pengumuman diterbitkan." };
  });
}

export async function deleteAnnouncementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    check(await supabase.from("announcements").delete().eq("id", str(formData, "id")));
    revalidatePath("/admin/pengumuman");
    revalidatePath("/penghuni", "layout");
    await setFlash("Pengumuman dihapus.");
    return { ok: true, message: "Pengumuman dihapus." };
  });
}

// ---------- Pengeluaran ----------
const expenseSchema = z.object({
  category: z.string().min(2, "Kategori wajib diisi").max(50),
  amount: z.coerce.number().int().min(100, "Nominal tidak valid"),
  spent_on: z.iso.date("Tanggal tidak valid"),
  description: z.string().max(300).nullable(),
});

export async function createExpenseAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const data = expenseSchema.parse({
      category: str(formData, "category"),
      amount: str(formData, "amount"),
      spent_on: str(formData, "spent_on"),
      description: optStr(formData, "description"),
    });
    const supabase = await createClient();
    check(await supabase.from("expenses").insert(data));
    revalidatePath("/admin/keuangan");
    return { ok: true, message: "Pengeluaran dicatat." };
  });
}

export async function deleteExpenseAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    check(await supabase.from("expenses").delete().eq("id", str(formData, "id")));
    revalidatePath("/admin/keuangan");
    await setFlash("Pengeluaran dihapus.");
    return { ok: true, message: "Pengeluaran dihapus." };
  });
}

// ---------- Pengaturan ----------
const lines = (value: string) =>
  value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const money = z.coerce.number().int().min(0, "Tidak boleh negatif");

const settingsSchema = z.object({
  kos_name: z.string().min(2, "Nama kos wajib diisi").max(80),
  tagline: z.string().max(160),
  description: z.string().max(2000),
  address: z.string().max(300),
  maps_embed_url: z
    .string()
    .nullable()
    .refine((v) => !v || v.startsWith("https://www.google.com/maps/embed"), "Gunakan URL embed dari Google Maps (Bagikan > Sematkan peta)."),
  whatsapp: z.string().regex(/^(\+?62|0)8\d{7,13}$/, "Nomor WhatsApp tidak valid"),
  email: z.union([z.email("Email tidak valid"), z.null()]),
  price_daily: money,
  price_weekly: money,
  price_monthly: money,
  deposit: money,
  room_size: z.string().max(50).nullable(),
  room_features: z.array(z.string().max(100)).max(30),
  bank_name: z.string().max(50).nullable(),
  bank_account_number: z.string().max(40).nullable(),
  bank_account_name: z.string().max(80).nullable(),
  rules: z.array(z.string().max(300)).max(50),
});

/** Ambil src dari kode <iframe> jika admin menempelkan kode sematan lengkap. */
function extractMapsSrc(value: string | null) {
  if (!value) return null;
  const match = value.match(/src="([^"]+)"/);
  return match ? match[1] : value;
}

export async function updateSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const data = settingsSchema.parse({
      kos_name: str(formData, "kos_name"),
      tagline: str(formData, "tagline"),
      description: str(formData, "description"),
      address: str(formData, "address"),
      maps_embed_url: extractMapsSrc(optStr(formData, "maps_embed_url")),
      whatsapp: str(formData, "whatsapp"),
      email: optStr(formData, "email"),
      price_daily: str(formData, "price_daily") || "0",
      price_weekly: str(formData, "price_weekly") || "0",
      price_monthly: str(formData, "price_monthly") || "0",
      deposit: str(formData, "deposit") || "0",
      room_size: optStr(formData, "room_size"),
      room_features: lines(str(formData, "room_features")),
      bank_name: optStr(formData, "bank_name"),
      bank_account_number: optStr(formData, "bank_account_number"),
      bank_account_name: optStr(formData, "bank_account_name"),
      rules: lines(str(formData, "rules")),
    });
    if (data.price_daily + data.price_weekly + data.price_monthly === 0) {
      throw new Error("Isi minimal satu harga sewa.");
    }

    const supabase = await createClient();
    const current = await getSettings();
    let qrisPath = current.qris_path;
    const qris = formData.get("qris");
    if (isFile(qris)) {
      const err = validateFile(qris);
      if (err) throw new Error(`QRIS: ${err}`);
      qrisPath = await uploadFile("public-images", "qris", qris);
    } else if (formData.get("remove_qris") === "on") {
      qrisPath = null;
    }

    check(
      await supabase
        .from("settings")
        .update({ ...data, qris_path: qrisPath, updated_at: new Date().toISOString() })
        .eq("id", 1),
    );
    if (qrisPath !== current.qris_path) await removeFiles("public-images", [current.qris_path]);

    revalidatePublic();
    return { ok: true, message: "Pengaturan disimpan." };
  });
}

// ---------- Konten: galeri ----------
export async function uploadGalleryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const file = formData.get("image");
    if (!isFile(file)) throw new Error("Pilih foto terlebih dahulu.");
    const err = validateFile(file);
    if (err) throw new Error(err);
    const path = await uploadFile("public-images", "gallery", file);
    const supabase = await createClient();
    const { error } = await supabase.from("gallery").insert({
      image_path: path,
      caption: optStr(formData, "caption"),
      sort_order: Number(str(formData, "sort_order")) || 0,
    });
    if (error) {
      await removeFiles("public-images", [path]);
      throw new Error(error.message);
    }
    revalidatePath("/admin/konten");
    revalidatePublic();
    return { ok: true, message: "Foto ditambahkan ke galeri." };
  });
}

export async function updateGalleryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    check(
      await supabase
        .from("gallery")
        .update({ caption: optStr(formData, "caption"), sort_order: Number(str(formData, "sort_order")) || 0 })
        .eq("id", str(formData, "id")),
    );
    revalidatePath("/admin/konten");
    revalidatePublic();
    return { ok: true, message: "Foto diperbarui." };
  });
}

export async function deleteGalleryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const item = must(
      await supabase.from("gallery").delete().eq("id", str(formData, "id")).select("image_path").single(),
    );
    await removeFiles("public-images", [item.image_path]);
    revalidatePath("/admin/konten");
    revalidatePublic();
    await setFlash("Foto dihapus.");
    return { ok: true, message: "Foto dihapus." };
  });
}

// ---------- Konten: fasilitas ----------
const facilitySchema = z.object({
  name: z.string().min(2, "Nama fasilitas wajib diisi").max(60),
  description: z.string().max(200).nullable(),
  icon: z.string().min(1).max(30),
  is_room_facility: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

function parseFacility(formData: FormData) {
  return facilitySchema.parse({
    name: str(formData, "name"),
    description: optStr(formData, "description"),
    icon: str(formData, "icon") || "check",
    is_room_facility: formData.get("is_room_facility") === "on",
    sort_order: str(formData, "sort_order") || "0",
  });
}

export async function saveFacilityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const id = str(formData, "id");
    const data = parseFacility(formData);
    check(id ? await supabase.from("facilities").update(data).eq("id", id) : await supabase.from("facilities").insert(data));
    revalidatePath("/admin/konten");
    revalidatePublic();
    return { ok: true, message: id ? "Fasilitas diperbarui." : "Fasilitas ditambahkan." };
  });
}

export async function deleteFacilityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    check(await supabase.from("facilities").delete().eq("id", str(formData, "id")));
    revalidatePath("/admin/konten");
    revalidatePublic();
    await setFlash("Fasilitas dihapus.");
    return { ok: true, message: "Fasilitas dihapus." };
  });
}

// ---------- Konten: testimoni ----------
const testimonialSchema = z.object({
  name: z.string().min(2, "Nama wajib diisi").max(60),
  content: z.string().min(5, "Isi testimoni terlalu pendek").max(500),
  rating: z.coerce.number().int().min(1).max(5),
  is_published: z.boolean(),
});

export async function saveTestimonialAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    const id = str(formData, "id");
    const data = testimonialSchema.parse({
      name: str(formData, "name"),
      content: str(formData, "content"),
      rating: str(formData, "rating") || "5",
      is_published: formData.get("is_published") === "on",
    });
    check(id ? await supabase.from("testimonials").update(data).eq("id", id) : await supabase.from("testimonials").insert(data));
    revalidatePath("/admin/konten");
    revalidatePublic();
    return { ok: true, message: id ? "Testimoni diperbarui." : "Testimoni ditambahkan." };
  });
}

export async function deleteTestimonialAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return adminAction(async () => {
    const supabase = await createClient();
    check(await supabase.from("testimonials").delete().eq("id", str(formData, "id")));
    revalidatePath("/admin/konten");
    revalidatePublic();
    await setFlash("Testimoni dihapus.");
    return { ok: true, message: "Testimoni dihapus." };
  });
}
