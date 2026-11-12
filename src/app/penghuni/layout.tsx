import type { Metadata } from "next";
import { LogoutButton } from "@/components/logout-button";
import { TenantShell } from "@/components/tenant/tenant-shell";
import { requireTenant } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = {
  title: { default: "Portal Penghuni", template: "%s | Portal Penghuni" },
  robots: { index: false, follow: false },
};

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, settings] = await Promise.all([requireTenant(), getSettings()]);

  return (
    <TenantShell
      kosName={settings.kos_name}
      tenantName={profile.full_name || profile.email || "Penghuni"}
      footer={<LogoutButton />}
    >
      {children}
    </TenantShell>
  );
}
