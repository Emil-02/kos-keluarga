import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BedDouble, CalendarClock, ChevronRight, History, Megaphone, Receipt, UserRound, Wallet, Wrench } from "lucide-react";
import { ExtendForm } from "@/components/tenant/extend-form";
import { MAX_EXTEND_PERIODS } from "@/components/tenant/constants";
import { InvoiceStatusBadge } from "@/components/tenant/badges";
import { LinkButton } from "@/components/ui/button";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { addPeriod, daysBetween, formatDate, formatRupiah, isOverdue, PERIOD_LABEL, PERIOD_UNIT, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TenantDashboardPage() {
  const { user, profile } = await requireTenant();
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: tenancies }, { data: openInvoices }, { data: announcements }] = await Promise.all([
    supabase
      .from("tenancies")
      .select("id, period, price, start_date, end_date, paid_until, auto_renew, status, rooms(number, floor)")
      .eq("tenant_id", user.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, number, description, amount, due_date, status")
      .in("status", ["belum_bayar", "menunggu_verifikasi"])
      .order("due_date", { ascending: true }),
    supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  const active = (tenancies ?? []).filter((t) => t.status === "aktif");
  const pastCount = (tenancies ?? []).length - active.length;

  const nextStarts = await Promise.all(
    active.map(async (t) => {
      const { data } = await supabase.rpc("next_billing_start", { p_tenancy_id: t.id });
      return data ?? null;
    }),
  );

  const unpaid = (openInvoices ?? []).filter((i) => i.status === "belum_bayar");
  const waiting = (openInvoices ?? []).filter((i) => i.status === "menunggu_verifikasi");
  const overdue = unpaid.filter((i) => isOverdue(i));
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amount, 0);
  const nextDue = unpaid[0];
  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Halo, ${firstName} 👋` : "Halo 👋"}
        description="Ringkasan sewa, tagihan, dan informasi terbaru untuk Anda."
      />

      {overdue.length > 0 && (
        <Alert tone="error">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Ada <strong>{overdue.length} tagihan terlambat</strong> sebesar{" "}
              <strong>{formatRupiah(overdue.reduce((s, i) => s + i.amount, 0))}</strong>. Mohon segera lakukan pembayaran.{" "}
              <Link href="/penghuni/tagihan?status=belum" className="font-semibold underline">
                Lihat tagihan
              </Link>
            </span>
          </span>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total belum dibayar"
          value={formatRupiah(unpaidTotal)}
          hint={
            unpaid.length > 0
              ? `${unpaid.length} tagihan${overdue.length ? `, ${overdue.length} terlambat` : ""}`
              : "Tidak ada tagihan yang perlu dibayar"
          }
          icon={<Wallet className="size-5" />}
          tone={overdue.length ? "red" : unpaid.length ? "amber" : "brand"}
        />
        <StatCard
          label="Jatuh tempo berikutnya"
          value={nextDue ? formatDate(nextDue.due_date, { short: true }) : "-"}
          hint={
            nextDue
              ? isOverdue(nextDue)
                ? `Terlambat ${daysBetween(nextDue.due_date, today)} hari · ${formatRupiah(nextDue.amount)}`
                : `${nextDue.number} · ${formatRupiah(nextDue.amount)}`
              : "Semua tagihan sudah beres"
          }
          icon={<CalendarClock className="size-5" />}
          tone={nextDue && isOverdue(nextDue) ? "red" : "sky"}
        />
        <StatCard
          label="Menunggu verifikasi"
          value={waiting.length}
          hint={waiting.length ? "Bukti bayar sedang diperiksa pengelola" : "Tidak ada bukti yang menunggu"}
          icon={<Receipt className="size-5" />}
          tone="brand"
        />
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BedDouble className="size-6" />}
            title="Belum ada sewa yang aktif"
            description={
              pastCount > 0
                ? "Masa sewa Anda sebelumnya sudah selesai. Terima kasih telah tinggal bersama kami!"
                : "Data sewa Anda akan muncul di sini setelah pengelola mengaktifkan kamar Anda."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {pastCount > 0 && (
                  <LinkButton href="/penghuni/profil#riwayat" variant="outline">
                    <History className="size-4" /> Lihat riwayat sewa
                  </LinkButton>
                )}
                <LinkButton href="/penghuni/tagihan" variant="secondary">
                  <Receipt className="size-4" /> Lihat tagihan
                </LinkButton>
              </div>
            }
          />
        </Card>
      ) : (
        active.map((t, idx) => {
          const unit = PERIOD_UNIT[t.period];
          const hasPaid = t.paid_until > t.start_date;
          return (
            <div key={t.id} className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader
                  title={`Kamar ${t.rooms?.number ?? "-"}`}
                  description={t.rooms?.floor ? `Lantai ${t.rooms.floor}` : undefined}
                  action={<Badge tone="green">Sewa aktif</Badge>}
                />
                <CardBody>
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Info label="Jenis sewa" value={PERIOD_LABEL[t.period]} />
                    <Info label="Harga" value={`${formatRupiah(t.price)} / ${unit}`} />
                    <Info label="Mulai sewa" value={formatDate(t.start_date)} />
                    <Info
                      label="Lunas sampai"
                      value={hasPaid ? formatDate(addPeriod(t.paid_until, "harian", -1)) : "Belum ada periode lunas"}
                      tone={hasPaid && t.paid_until > today ? "good" : "warn"}
                    />
                    <Info
                      label="Berakhir"
                      value={t.end_date ? formatDate(t.end_date) : t.auto_renew ? "Berjalan (diperpanjang otomatis)" : "Berjalan"}
                    />
                  </dl>
                </CardBody>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader
                  title="Perpanjang / bayar di muka"
                  description={`Buat tagihan untuk 1–${MAX_EXTEND_PERIODS[t.period]} ${unit} berikutnya.`}
                />
                <CardBody>
                  <ExtendForm tenancyId={t.id} period={t.period} price={t.price} startDate={t.start_date} nextStart={nextStarts[idx]} />
                </CardBody>
              </Card>
            </div>
          );
        })
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Pengumuman terbaru"
            action={
              <Link href="/penghuni/pengumuman" className="text-sm font-semibold text-brand-700 hover:underline">
                Semua
              </Link>
            }
          />
          {announcements && announcements.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {announcements.map((a) => (
                <li key={a.id} className="px-5 py-4">
                  <p className="font-medium text-stone-900">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-stone-600">{a.body}</p>
                  <p className="mt-1 text-xs text-stone-400">{formatDate(a.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Megaphone className="size-6" />} title="Belum ada pengumuman" />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Akses cepat" />
          <CardBody className="space-y-2">
            {unpaid.slice(0, 3).map((inv) => (
              <Link
                key={inv.id}
                href={`/penghuni/tagihan/${inv.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2.5 text-sm hover:bg-stone-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-stone-900">Bayar {inv.description}</span>
                  <span className="text-xs text-stone-500">{formatRupiah(inv.amount)}</span>
                </span>
                <InvoiceStatusBadge invoice={inv} />
              </Link>
            ))}
            <QuickLink href="/penghuni/tagihan" icon={<Receipt className="size-4" />} label="Semua tagihan & kwitansi" />
            <QuickLink href="/penghuni/keluhan" icon={<Wrench className="size-4" />} label="Laporkan keluhan / kerusakan" />
            <QuickLink href="/penghuni/profil" icon={<UserRound className="size-4" />} label="Profil & riwayat sewa" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd
        className={
          tone === "good"
            ? "mt-0.5 font-semibold text-emerald-700"
            : tone === "warn"
              ? "mt-0.5 font-semibold text-amber-700"
              : "mt-0.5 font-semibold text-stone-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
    >
      <span className="rounded-lg bg-brand-50 p-1.5 text-brand-700">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-stone-400" />
    </Link>
  );
}
