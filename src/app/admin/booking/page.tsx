import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Card, EmptyState, PageHeader, Table, TBody, THead } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/admin/badges";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, PERIOD_UNIT } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { BookingStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Booking" };

const TABS: { key: BookingStatus | "semua"; label: string }[] = [
  { key: "menunggu", label: "Menunggu" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "dibatalkan", label: "Dibatalkan" },
  { key: "semua", label: "Semua" },
];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = "menunggu" } = await searchParams;
  const active = TABS.find((t) => t.key === status)?.key ?? "menunggu";

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, code, full_name, phone, period, start_date, duration, end_date, status, created_at, rooms(number)")
    .order("created_at", { ascending: active === "menunggu" })
    .limit(200);
  if (active !== "semua") query = query.eq("status", active);
  const { data: bookings } = await query;

  return (
    <>
      <PageHeader title="Booking" description="Kelola permintaan sewa dari website." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/booking?status=${tab.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active === tab.key ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        {bookings?.length ? (
          <Table>
            <THead>
              <tr>
                <th>Pemesan</th>
                <th>Sewa</th>
                <th>Mulai</th>
                <th>Status</th>
                <th>Masuk</th>
              </tr>
            </THead>
            <TBody>
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50">
                  <td>
                    <Link href={`/admin/booking/${b.id}`} className="font-semibold text-brand-700 hover:underline">
                      {b.full_name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {b.code} · {b.phone}
                    </p>
                  </td>
                  <td>
                    {b.duration} {PERIOD_UNIT[b.period]}
                    {b.rooms && <p className="text-xs text-stone-500">Kamar {b.rooms.number}</p>}
                  </td>
                  <td>{formatDate(b.start_date, { short: true })}</td>
                  <td>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="text-xs text-stone-500">{formatDateTime(b.created_at)}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<CalendarCheck className="size-6" />} title="Tidak ada booking" description="Booking dari halaman /booking akan muncul di sini." />
        )}
      </Card>
    </>
  );
}
