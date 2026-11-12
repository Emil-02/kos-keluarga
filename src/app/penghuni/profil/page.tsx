import type { Metadata } from "next";
import { History, KeyRound } from "lucide-react";
import { ProfileForm } from "@/components/tenant/profile-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { formatDate, formatRupiah, PERIOD_LABEL, PERIOD_UNIT } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profil" };

export default async function TenantProfilePage() {
  const { user, profile } = await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenancies")
    .select("id, period, price, start_date, end_date, status, auto_renew, ended_at, rooms(number)")
    .eq("tenant_id", user.id)
    .order("start_date", { ascending: false });
  const tenancies = data ?? [];

  return (
    <div>
      <PageHeader title="Profil" description="Kelola data diri Anda agar pengelola mudah menghubungi." />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Data diri" />
            <CardBody>
              <ProfileForm email={profile.email} fullName={profile.full_name} phone={profile.phone} address={profile.address} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Keamanan akun" />
            <CardBody>
              <p className="mb-3 text-sm text-stone-600">Ganti password secara berkala, terutama jika masih memakai password sementara dari pengelola.</p>
              <LinkButton href="/akun/password" variant="outline">
                <KeyRound className="size-4" /> Ubah password
              </LinkButton>
            </CardBody>
          </Card>

          <Card id="riwayat" className="scroll-mt-20">
            <CardHeader title="Riwayat sewa" />
            {tenancies.length === 0 ? (
              <EmptyState icon={<History className="size-6" />} title="Belum ada riwayat sewa" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {tenancies.map((t) => (
                  <li key={t.id} className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-stone-900">Kamar {t.rooms?.number ?? "-"}</p>
                      {t.status === "aktif" ? <Badge tone="green">Aktif</Badge> : <Badge tone="gray">Selesai</Badge>}
                    </div>
                    <p className="mt-0.5 text-stone-600">
                      {PERIOD_LABEL[t.period]} · {formatRupiah(t.price)} / {PERIOD_UNIT[t.period]}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDate(t.start_date)} –{" "}
                      {t.end_date ? formatDate(t.end_date) : t.auto_renew ? "berjalan (diperpanjang otomatis)" : "berjalan"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
