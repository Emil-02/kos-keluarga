import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { LogoutButton } from "@/components/logout-button";
import { FlashMessage } from "@/components/admin/flash-message";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Panel Admin", template: "%s | Panel Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [settings, bookings, payments, complaints] = await Promise.all([
    getSettings(),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "baru"),
  ]);

  return (
    <AdminShell
      kosName={settings.kos_name}
      adminName={profile.full_name || profile.email || "Admin"}
      badges={{
        bookings: bookings.count ?? 0,
        payments: payments.count ?? 0,
        complaints: complaints.count ?? 0,
      }}
      footer={<LogoutButton />}
    >
      <FlashMessage />
      {children}
    </AdminShell>
  );
}
