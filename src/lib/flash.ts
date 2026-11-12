import "server-only";
import { cookies } from "next/headers";

const FLASH_COOKIE = "admin_flash";

/** Simpan pesan sekali-tampil untuk halaman berikutnya (setelah redirect). */
export async function setFlash(message: string, tone: "success" | "error" = "success") {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ message, tone }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 120,
  });
}

export async function readFlash(): Promise<{ message: string; tone: "success" | "error" } | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearFlash() {
  (await cookies()).delete(FLASH_COOKIE);
}
