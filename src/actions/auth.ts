"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/format";
import type { ActionState } from "@/lib/types";

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  // hanya izinkan path internal untuk mencegah open redirect
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { message: "Email atau password salah." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const isAdmin = profile?.role === "admin";
  const next = safeNext(formData.get("next"));
  const home = isAdmin ? "/admin" : "/penghuni";
  // penghuni tidak diarahkan ke /admin, admin tidak diarahkan ke /penghuni
  const allowed = next && (isAdmin ? !next.startsWith("/penghuni") : !next.startsWith("/admin"));
  redirect(allowed ? next : home);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { errors: { email: ["Email tidak valid"] } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: siteUrl("/auth/callback?next=/akun/password"),
  });
  // selalu tampilkan pesan yang sama agar email terdaftar tidak bisa ditebak
  return { ok: true, message: "Jika email terdaftar, tautan reset password sudah dikirim. Silakan cek kotak masuk Anda." };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Konfirmasi password tidak sama", path: ["confirm"] });

export async function updatePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      message:
        error.code === "same_password"
          ? "Password baru tidak boleh sama dengan password lama."
          : `Gagal mengubah password: ${error.message}`,
    };
  }
  return { ok: true, message: "Password berhasil diubah." };
}
