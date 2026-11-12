import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Table, TBody, THead, Badge } from "@/components/ui/card";
import { ManualTenantForm } from "@/components/admin/manual-tenant-form";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { addPeriod, formatDate, formatRupiah, isOverdue, PERIOD_LABEL, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { RentPeriod } from "@/lib/types";

export const metadata: Metadata = { title: "Penghuni" };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireAdmin();
  const { tab = "aktif", q = "" } = await searchParams;
  const status = tab === "selesai" ? "selesai" : "aktif";
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: tenancies }, { data: freeRooms }, settings, { data: allRooms }, { data: activeTenancies }] = await Promise.all([
    supabase
      .from("tenancies")
      .select(
        "id, period, price, start_date, end_date, paid_until, status, ended_at, rooms(number), profiles!tenancies_tenant_id_fkey(full_name, phone, email), invoices(amount, status, due_date)",
      )
      .eq("status", status)
      .order(status === "aktif" ? "start_date" : "ended_at", { ascending: status === "aktif" ? true : false })
      .limit(300),
    supabase.rpc("available_rooms", { p_start: today, p_end: addPeriod(today, "harian", 1) }),
    getSettings(),
    supabase.from("rooms").select("id, number, floor").eq("status", "aktif").order("floor").order("number"),
    supabase.from("tenancies").select("room_id, start_date, end_date").eq("status", "aktif").order("start_date"),
  ]);

  // keterangan per kamar agar admin tahu kamar mana yang terisi / sudah dipesan
  const roomOptions = (allRooms ?? []).map((room) => {
    const list = (activeTenancies ?? []).filter((t) => t.room_id === room.id);
    const current = list.find((t) => t.start_date <= today);
    const upcoming = list.find((t) => t.start_date > today);
    let note: string | null = null;
    if (current) note = current.end_date ? `terisi s/d ${formatDate(current.end_date, { short: true })}` : "terisi";
    else if (upcoming) note = `dipesan mulai ${formatDate(upcoming.start_date, { short: true })}`;
    return { ...room, note };
  });

  const keyword = q.trim().toLowerCase();
  const rows = (tenancies ?? [])
    .filter(
      (t) =>
        !keyword ||
        t.profiles?.full_name.toLowerCase().includes(keyword) ||
        t.profiles?.phone?.includes(keyword) ||
        t.rooms?.number.toLowerCase().includes(keyword),
    )
    .map((t) => {
      const unpaid = t.invoices.filter((i) => i.status === "belum_bayar" || i.status === "menunggu_verifikasi");
      return {
        ...t,
        unpaidTotal: unpaid.reduce((s, i) => s + i.amount, 0),
        overdue: unpaid.some((i) => isOverdue(i)),
      };
    });

  const periods = (["harian", "mingguan", "bulanan"] as RentPeriod[]).filter(
    (p) => (p === "harian" ? settings.price_daily : p === "mingguan" ? settings.price_weekly : settings.price_monthly) > 0,
  );

  return (
    <>
      <PageHeader title="Penghuni" description="Daftar penghuni, masa sewa, dan status pembayaran." />

      <details className="group mb-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold text-stone-800">
          <UserPlus className="size-5 text-brand-600" /> Tambah penghuni manual
          <span className="ml-auto text-sm font-normal text-stone-500 group-open:hidden">untuk penghuni lama / yang datang langsung</span>
        </summary>
        <div className="border-t border-stone-100 p-5">
          <ManualTenantForm rooms={roomOptions} periods={periods} />
        </div>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: "aktif", label: "Aktif" },
          { key: "selesai", label: "Sudah keluar" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/penghuni?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              status === t.key ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50",
            )}
          >
            {t.label}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="tab" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama / HP / kamar…"
            className="h-9 w-56 rounded-xl border border-stone-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </form>
      </div>

      <Card>
        {rows.length ? (
          <Table>
            <THead>
              <tr>
                <th>Penghuni</th>
                <th>Kamar</th>
                <th>Sewa</th>
                <th>{status === "aktif" ? "Lunas s/d" : "Keluar"}</th>
                <th className="text-right">Tunggakan</th>
              </tr>
            </THead>
            <TBody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50">
                  <td>
                    <Link href={`/admin/penghuni/${t.id}`} className="font-semibold text-brand-700 hover:underline">
                      {t.profiles?.full_name || "(tanpa nama)"}
                    </Link>
                    <p className="text-xs text-stone-500">{t.profiles?.phone}</p>
                  </td>
                  <td className="font-medium">{t.rooms?.number}</td>
                  <td>
                    {PERIOD_LABEL[t.period]} · {formatRupiah(t.price)}
                    <p className="text-xs text-stone-500">sejak {formatDate(t.start_date, { short: true })}</p>
                  </td>
                  <td>
                    {status === "aktif"
                      ? t.paid_until > t.start_date
                        ? formatDate(addPeriod(t.paid_until, "harian", -1), { short: true })
                        : "Belum bayar"
                      : formatDate(t.end_date, { short: true })}
                  </td>
                  <td className="text-right">
                    {t.unpaidTotal > 0 ? (
                      <Badge tone={t.overdue ? "red" : "yellow"}>{formatRupiah(t.unpaidTotal)}</Badge>
                    ) : (
                      <Badge tone="green">Lunas</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Users className="size-6" />} title="Belum ada penghuni" description="Setujui booking atau tambahkan penghuni manual." />
        )}
      </Card>
      {status === "aktif" && (
        <Card className="mt-6">
          <CardHeader title="Kamar kosong hari ini" />
          <CardBody className="flex flex-wrap gap-2">
            {freeRooms?.length ? (
              freeRooms.map((r) => (
                <Badge key={r.id} tone="brand">
                  Kamar {r.number}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-stone-500">Semua kamar terisi.</span>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
}
