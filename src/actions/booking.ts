"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MAX_ADVANCE_MONTHS, MAX_DURATION, periodPrice } from "@/components/public/periods";
import { countAvailableRooms, getSettings } from "@/lib/data/public";
import { addPeriod, normalizePhone, PERIOD_UNIT, todayISO } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { bookingReceivedText, newBookingAdminText } from "@/lib/notifications/templates";
import { isFile, removeFiles, uploadFile, validateFile, FileValidationError } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  // 256 habis dibagi 32 sehingga distribusi karakter tetap merata
  return `KK-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
}

function cleanPhone(value: string) {
  return value.replace(/[\s\-().]/g, "");
}

const bookingSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Nama lengkap minimal 3 karakter")
      .max(100, "Nama lengkap maksimal 100 karakter"),
    phone: z
      .string()
      .trim()
      .transform(cleanPhone)
      .refine((v) => /^(\+62|62|0)8\d{7,12}$/.test(v), "Nomor WhatsApp tidak valid (contoh: 081234567890)")
      .transform((v) => `0${normalizePhone(v).slice(2)}`),
    email: z.string().trim().toLowerCase().pipe(z.email("Email tidak valid").max(120, "Email terlalu panjang")),
    period: z.enum(["harian", "mingguan", "bulanan"], "Pilih periode sewa"),
    start_date: z
      .string("Tanggal mulai wajib diisi")
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Tanggal mulai tidak valid", abort: true })
      .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), {
        message: "Tanggal mulai tidak valid",
        abort: true,
      })
      .superRefine((v, ctx) => {
        const today = todayISO();
        if (v < today) {
          ctx.addIssue({ code: "custom", message: "Tanggal mulai tidak boleh sebelum hari ini" });
        } else if (v > addPeriod(today, "bulanan", MAX_ADVANCE_MONTHS)) {
          ctx.addIssue({ code: "custom", message: `Tanggal mulai maksimal ${MAX_ADVANCE_MONTHS} bulan dari hari ini` });
        }
      }),
    duration: z.coerce.number("Durasi tidak valid").int("Durasi tidak valid").min(1, "Durasi minimal 1"),
    occupants: z.coerce.number("Jumlah penghuni tidak valid").int().min(1, "Minimal 1 orang").max(2, "Maksimal 2 orang per kamar"),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
    agree: z.literal("on", "Anda harus menyetujui peraturan kos"),
  })
  .superRefine((data, ctx) => {
    const max = MAX_DURATION[data.period];
    if (data.duration > max) {
      ctx.addIssue({ code: "custom", path: ["duration"], message: `Durasi maksimal ${max} ${PERIOD_UNIT[data.period]}` });
    }
  });

export async function createBookingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // honeypot: kolom tersembunyi yang hanya diisi oleh bot
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { message: "Permintaan tidak dapat diproses. Silakan coba lagi." };
  }

  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = bookingSchema.safeParse({
    full_name: str("full_name") ?? "",
    phone: str("phone") ?? "",
    email: str("email") ?? "",
    period: str("period"),
    start_date: str("start_date"),
    duration: str("duration"),
    occupants: str("occupants") ?? "1",
    note: str("note") || undefined,
    agree: str("agree"),
  });

  const errors: Record<string, string[] | undefined> = parsed.success ? {} : { ...z.flattenError(parsed.error).fieldErrors };

  const file = formData.get("id_card");
  if (!isFile(file)) {
    errors.id_card = ["Foto KTP wajib diunggah"];
  } else {
    const fileError = validateFile(file);
    if (fileError) errors.id_card = [fileError];
  }

  const settings = await getSettings();
  if (parsed.success && periodPrice(settings, parsed.data.period) <= 0) {
    errors.period = ["Periode sewa ini sedang tidak tersedia"];
  }

  if (!parsed.success || Object.keys(errors).length > 0 || !isFile(file)) {
    return { message: "Periksa kembali isian formulir Anda.", errors };
  }

  const data = parsed.data;
  const endForCheck = data.period === "harian" ? addPeriod(data.start_date, "harian", data.duration) : null;
  const available = await countAvailableRooms(data.start_date, endForCheck);
  if (available <= 0) {
    return {
      message:
        "Maaf, tidak ada kamar kosong untuk tanggal tersebut. Silakan pilih tanggal lain atau hubungi kami via WhatsApp untuk daftar tunggu.",
    };
  }

  const supabase = createAdminClient();
  let code: string | null = null;

  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateCode();
    const { data: existing } = await supabase.from("bookings").select("id").eq("code", candidate).maybeSingle();
    if (existing) continue;

    let idCardPath: string;
    try {
      idCardPath = await uploadFile("documents", `ktp/bookings/${candidate}`, file);
    } catch (err) {
      if (err instanceof FileValidationError) return { errors: { id_card: [err.message] }, message: err.message };
      console.error("[booking] upload KTP gagal", err);
      return { message: "Gagal mengunggah foto KTP. Silakan coba lagi." };
    }

    const { error } = await supabase.from("bookings").insert({
      code: candidate,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      id_card_path: idCardPath,
      period: data.period,
      start_date: data.start_date,
      duration: data.duration,
      occupants: data.occupants,
      note: data.note || null,
    });

    if (!error) {
      code = candidate;
      break;
    }

    await removeFiles("documents", [idCardPath]);
    if (error.code !== "23505") {
      console.error("[booking] insert gagal", error);
      return { message: "Terjadi kesalahan saat menyimpan booking. Silakan coba lagi." };
    }
  }

  if (!code) return { message: "Terjadi kesalahan saat membuat kode booking. Silakan coba lagi." };

  const bookingCode = code;
  after(async () => {
    await Promise.all([
      notify({
        kind: "booking_diterima",
        email: data.email,
        phone: data.phone,
        subject: `Booking ${bookingCode} diterima — ${settings.kos_name}`,
        text: bookingReceivedText(settings, { code: bookingCode, full_name: data.full_name }),
      }),
      notify({
        kind: "booking_baru_admin",
        email: settings.email,
        phone: settings.whatsapp || null,
        subject: `Booking baru ${bookingCode} — ${data.full_name}`,
        text: newBookingAdminText({
          code: bookingCode,
          full_name: data.full_name,
          phone: data.phone,
          period: data.period,
          start_date: data.start_date,
          duration: data.duration,
        }),
      }),
    ]);
  });

  redirect(`/booking/${bookingCode}`);
}
