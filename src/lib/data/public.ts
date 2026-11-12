import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addPeriod, todayISO } from "@/lib/format";

/** Client tanpa cookie untuk data publik (bisa di-cache/prerender). */
function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const getSettings = cache(async () => {
  const { data, error } = await createPublicClient().from("settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`Gagal memuat pengaturan: ${error?.message}`);
  return data;
});

export const getFacilities = cache(async () => {
  const { data } = await createPublicClient().from("facilities").select("*").order("sort_order");
  return data ?? [];
});

export const getGallery = cache(async () => {
  const { data } = await createPublicClient().from("gallery").select("*").order("sort_order").order("created_at");
  return data ?? [];
});

export const getTestimonials = cache(async () => {
  const { data } = await createPublicClient()
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getRoomSummary = cache(async () => {
  const supabase = createPublicClient();
  const today = todayISO();
  const [{ count: total }, { data: available }] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "aktif"),
    supabase.rpc("count_available_rooms", { p_start: today, p_end: addPeriod(today, "harian", 1) }),
  ]);
  return { total: total ?? 0, available: available ?? 0 };
});

/** Jumlah kamar kosong pada rentang [start, end). end null = tanpa batas (sewa berjalan). */
export async function countAvailableRooms(start: string, end: string | null) {
  const { data } = await createPublicClient().rpc("count_available_rooms", {
    p_start: start,
    p_end: end as string,
  });
  return data ?? 0;
}
