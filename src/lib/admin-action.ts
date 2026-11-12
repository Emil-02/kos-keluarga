import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

/** Bungkus Server Action admin: cek role, ubah error menjadi pesan untuk form. */
export async function adminAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    await assertAdmin();
    return (await fn()) ?? { ok: true, message: "Berhasil disimpan." };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof z.ZodError) {
      return { message: err.issues[0]?.message ?? "Data tidak valid.", errors: z.flattenError(err).fieldErrors };
    }
    return { message: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

type QueryResult<T> = { data: T; error: { message: string } | null };

/** Lempar error jika query Supabase gagal; kembalikan data apa adanya. */
export function check<T>(result: QueryResult<T>, context = "Gagal menyimpan") {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

/** Seperti check(), tetapi data wajib ada (untuk .single()). */
export function must<T>(result: QueryResult<T>, context = "Data tidak ditemukan"): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(result.error ? `${context}: ${result.error.message}` : context);
  }
  return result.data as NonNullable<T>;
}

export function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(formData: FormData, key: string) {
  return str(formData, key) || null;
}

export function revalidatePublic() {
  revalidatePath("/", "layout");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomString(length: number, alphabet = ALPHABET) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function generateTempPassword() {
  return `Kos-${randomString(4, "abcdefghjkmnpqrstuvwxyz")}${randomString(4, "23456789")}`;
}
