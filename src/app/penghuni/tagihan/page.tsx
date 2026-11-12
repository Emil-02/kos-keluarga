import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { formatPeriodRange, InvoiceStatusBadge } from "@/components/tenant/badges";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireTenant } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDate, formatRupiah, isOverdue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tagihan" };

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "belum", label: "Belum lunas" },
  { key: "lunas", label: "Lunas" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function TenantInvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireTenant();
  const { status } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === status) ? (status as TabKey) : "semua";

  const supabase = await createClient();
  // RLS membatasi hanya tagihan milik penghuni ini
  const { data } = await supabase
    .from("invoices")
    .select("id, number, description, amount, due_date, status, period_start, period_end, paid_at, created_at")
    .order("created_at", { ascending: false });
  const invoices = data ?? [];

  const groups: Record<TabKey, typeof invoices> = {
    semua: invoices,
    belum: invoices.filter((i) => i.status === "belum_bayar" || i.status === "menunggu_verifikasi"),
    lunas: invoices.filter((i) => i.status === "lunas"),
  };
  const shown = groups[tab];

  return (
    <div>
      <PageHeader title="Tagihan" description="Daftar tagihan sewa dan biaya lain. Klik tagihan untuk membayar atau melihat kwitansi." />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1 sm:inline-flex">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "semua" ? "/penghuni/tagihan" : `/penghuni/tagihan?status=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-center text-sm font-medium transition sm:flex-none",
              tab === t.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-stone-400">{groups[t.key].length}</span>
          </Link>
        ))}
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title={tab === "belum" ? "Tidak ada tagihan yang belum lunas" : tab === "lunas" ? "Belum ada tagihan lunas" : "Belum ada tagihan"}
            description={tab === "belum" ? "Terima kasih, semua tagihan Anda sudah beres. 🎉" : undefined}
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {shown.map((inv) => {
              const overdue = isOverdue(inv);
              const range = formatPeriodRange(inv.period_start, inv.period_end);
              return (
                <li key={inv.id}>
                  <Link
                    href={`/penghuni/tagihan/${inv.id}`}
                    className={cn("flex items-center gap-3 px-4 py-4 transition hover:bg-stone-50 sm:px-5", overdue && "bg-red-50/40")}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-stone-500">{inv.number}</span>
                        <InvoiceStatusBadge invoice={inv} />
                      </div>
                      <p className="mt-1 truncate font-medium text-stone-900">{inv.description}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {range && <>{range} · </>}
                        {inv.status === "lunas" ? (
                          <>Dibayar {formatDate(inv.paid_at, { short: true })}</>
                        ) : (
                          <span className={cn(overdue && "font-semibold text-red-700")}>
                            Jatuh tempo {formatDate(inv.due_date, { short: true })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-semibold", inv.status === "dibatalkan" ? "text-stone-400 line-through" : "text-stone-900")}>
                        {formatRupiah(inv.amount)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-stone-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
