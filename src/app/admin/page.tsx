import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BedDouble, CalendarCheck, Receipt, TrendingDown, TrendingUp, Wallet, Wrench } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/admin/badges";
import { RunBillingButton } from "@/components/admin/run-billing-button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah, isOverdue, PERIOD_LABEL, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: { absolute: "Dashboard | Panel Admin" } };

export default async function AdminDashboard() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [rooms, tenancies, bookings, pendingPayments, unpaid, income, expenses, complaints] = await Promise.all([
    supabase.from("rooms").select("id, status"),
    supabase.from("tenancies").select("room_id, start_date, end_date").eq("status", "aktif"),
    supabase
      .from("bookings")
      .select("id, code, full_name, period, start_date, duration, created_at", { count: "exact" })
      .eq("status", "menunggu")
      .order("created_at")
      .limit(5),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
    supabase
      .from("invoices")
      .select("id, number, description, amount, due_date, status, tenancy_id, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name))")
      .eq("status", "belum_bayar")
      .order("due_date")
      .limit(200),
    supabase.from("payments").select("amount").eq("status", "diterima").gte("paid_on", monthStart).lte("paid_on", today),
    supabase.from("expenses").select("amount").gte("spent_on", monthStart).lte("spent_on", today),
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "baru"),
  ]);

  const activeRooms = rooms.data?.filter((r) => r.status === "aktif").length ?? 0;
  const occupiedRoomIds = new Set(
    tenancies.data
      ?.filter((t) => t.start_date <= today && (!t.end_date || t.end_date > today))
      .map((t) => t.room_id),
  );
  const occupied = occupiedRoomIds.size;
  const unpaidList = unpaid.data ?? [];
  const overdue = unpaidList.filter(isOverdue);
  const unpaidTotal = unpaidList.reduce((s, i) => s + i.amount, 0);
  const incomeTotal = income.data?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const expenseTotal = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0;

  return (
    <>
      <PageHeader
        title={`Halo, ${profile.full_name.split(" ")[0] || "Admin"} 👋`}
        description={`Ringkasan kos per ${formatDate(today)}`}
        action={<RunBillingButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Kamar terisi"
          value={`${occupied} / ${activeRooms}`}
          hint={`${Math.max(activeRooms - occupied, 0)} kamar kosong hari ini`}
          icon={<BedDouble className="size-5" />}
        />
        <StatCard
          label="Pemasukan bulan ini"
          value={formatRupiah(incomeTotal)}
          hint={`Pengeluaran ${formatRupiah(expenseTotal)}`}
          icon={<TrendingUp className="size-5" />}
          tone="sky"
        />
        <StatCard
          label="Belum dibayar"
          value={formatRupiah(unpaidTotal)}
          hint={`${unpaidList.length} tagihan · ${overdue.length} terlambat`}
          icon={<Wallet className="size-5" />}
          tone={overdue.length > 0 ? "red" : "amber"}
        />
        <StatCard
          label="Laba bersih bulan ini"
          value={formatRupiah(incomeTotal - expenseTotal)}
          icon={<TrendingDown className="size-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ActionTile href="/admin/booking" icon={<CalendarCheck className="size-5" />} label="Booking menunggu" count={bookings.count ?? 0} />
        <ActionTile href="/admin/tagihan" icon={<Receipt className="size-5" />} label="Bukti bayar perlu dicek" count={pendingPayments.count ?? 0} />
        <ActionTile href="/admin/keluhan" icon={<Wrench className="size-5" />} label="Keluhan baru" count={complaints.count ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Booking baru"
            description="Calon penghuni yang menunggu persetujuan"
            action={<Link href="/admin/booking" className="text-sm font-semibold text-brand-700 hover:underline">Semua</Link>}
          />
          {bookings.data?.length ? (
            <ul className="divide-y divide-stone-100">
              {bookings.data.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/booking/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50">
                    <div>
                      <p className="font-medium text-stone-900">{b.full_name}</p>
                      <p className="text-xs text-stone-500">
                        {b.code} · {PERIOD_LABEL[b.period]} × {b.duration} · mulai {formatDate(b.start_date, { short: true })}
                      </p>
                    </div>
                    <span className="text-xs text-stone-400">{formatDate(b.created_at, { short: true })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Tidak ada booking baru" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Tagihan jatuh tempo"
            description="Belum dibayar, urut dari jatuh tempo terdekat"
            action={<Link href="/admin/tagihan?tab=belum" className="text-sm font-semibold text-brand-700 hover:underline">Semua</Link>}
          />
          {unpaidList.length ? (
            <ul className="divide-y divide-stone-100">
              {unpaidList.slice(0, 6).map((inv) => (
                <li key={inv.id}>
                  <Link href={`/admin/penghuni/${inv.tenancy_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">
                        {inv.tenancies.profiles?.full_name} · Kamar {inv.tenancies.rooms?.number}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {inv.description} · jatuh tempo {formatDate(inv.due_date, { short: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{formatRupiah(inv.amount)}</span>
                      <InvoiceStatusBadge invoice={inv} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Semua tagihan sudah lunas 🎉" />
          )}
        </Card>
      </div>

      {overdue.length > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="size-4" /> {overdue.length} tagihan terlambat. Pengingat otomatis dikirim setiap 3 hari; Anda juga bisa mengirim pengingat manual dari halaman penghuni.
        </p>
      )}
    </>
  );
}

function ActionTile({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <span className={count > 0 ? "rounded-xl bg-accent-500 p-2.5 text-white" : "rounded-xl bg-stone-100 p-2.5 text-stone-500"}>{icon}</span>
      <span className="flex-1 text-sm font-medium text-stone-700">{label}</span>
      <span className="text-xl font-bold text-stone-900">{count}</span>
    </Link>
  );
}
