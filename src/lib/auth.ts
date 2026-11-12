import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pengguna saat ini beserta profilnya (null jika belum login). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { user, profile };
});

export async function requireUser(next = "/") {
  const current = await getCurrentUser();
  if (!current) redirect(`/login?next=${encodeURIComponent(next)}`);
  return current;
}

export async function requireAdmin() {
  const current = await requireUser("/admin");
  if (current.profile.role !== "admin") redirect("/penghuni");
  return current;
}

export async function requireTenant() {
  const current = await requireUser("/penghuni");
  if (current.profile.role === "admin") redirect("/admin");
  return current;
}

/** Untuk Server Action admin: lempar error alih-alih redirect. */
export async function assertAdmin() {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    throw new Error("Akses ditolak: hanya admin.");
  }
  return current;
}
