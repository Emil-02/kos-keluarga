import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardBody, EmptyState, PageHeader, Table, TBody, THead } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/admin/badges";
import { InvoiceActions, PaymentReview } from "@/components/admin/invoice-tools";
import { RunBillingButton } from "@/components/admin/run-billing-button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { formatDate, formatRupiah, isOverdue } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Tagihan & Pembayaran" };

const TABS = [
  { key: "verifikasi", label: "Perlu verifikasi" },
  { key: "belum", label: "Belum dibayar" },
  { key: "terlambat", label: "Terlambat" },
  { key: "lunas", label: "Lunas" },
  { key: "semua", label: "Semua" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const INVOICE_SELECT =
  "id, number, description, amount, due_date, status, type, paid_at, tenancy_id, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name))";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const active: TabKey = TABS.find((t) => t.key === tab)?.key ?? "verifikasi";
  const supabase = await createClient();

  return (
    <>
      <PageHeader
        title="Tagihan & Pembayaran"
        description="Verifikasi bukti transfer, pantau tunggakan, dan catat pembayaran tunai."
        action={<RunBillingButton />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/tagihan?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              active === t.key ? "bg-brand-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "verifikasi" ? <VerificationList supabase={supabase} /> : <InvoiceList supabase={supabase} tab={active} />}
    </>
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function VerificationList({ supabase }: { supabase: Supabase }) {
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, method, paid_on, note, created_at, proof_path, invoices!inner(number, description, amount, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name)))",
    )
    .eq("status", "menunggu")
    .order("created_at");

  if (!payments?.length) {
    return (
      <Card>
        <EmptyState icon={<Receipt className="size-6" />} title="Tidak ada bukti pembayaran yang menunggu" description="Bukti transfer yang diunggah penghuni akan muncul di sini." />
      </Card>
    );
  }

  const urls = await signedUrls(payments.map((p) => p.proof_path));
  return (
    <Card>
      <CardBody className="space-y-4">
        {payments.map((p) => (
          <PaymentReview
            key={p.id}
            payment={p}
            invoice={p.invoices}
            proofUrl={p.proof_path ? urls[p.proof_path] ?? null : null}
            tenantName={p.invoices.tenancies.profiles?.full_name}
            roomNumber={p.invoices.tenancies.rooms?.number}
          />
        ))}
      </CardBody>
    </Card>
  );
}

async function InvoiceList({ supabase, tab }: { supabase: Supabase; tab: Exclude<TabKey, "verifikasi"> }) {
  let query = supabase.from("invoices").select(INVOICE_SELECT).limit(300);
  if (tab === "belum" || tab === "terlambat") query = query.in("status", ["belum_bayar", "menunggu_verifikasi"]).order("due_date");
  else if (tab === "lunas") query = query.eq("status", "lunas").order("paid_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data } = await query;
  const invoices = (data ?? []).filter((inv) => tab !== "terlambat" || isOverdue(inv));
  const total = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <Card>
      {invoices.length ? (
        <>
          <Table>
            <THead>
              <tr>
                <th>Penghuni</th>
                <th>Tagihan</th>
                <th>{tab === "lunas" ? "Dibayar" : "Jatuh tempo"}</th>
                <th className="text-right">Jumlah</th>
                <th>Status</th>
                <th />
              </tr>
            </THead>
            <TBody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/admin/penghuni/${inv.tenancy_id}`} className="font-semibold text-brand-700 hover:underline">
                      {inv.tenancies.profiles?.full_name}
                    </Link>
                    <p className="text-xs text-stone-500">Kamar {inv.tenancies.rooms?.number}</p>
                  </td>
                  <td>
                    {inv.description}
                    <p className="text-xs text-stone-500">{inv.number}</p>
                  </td>
                  <td className="whitespace-nowrap">
                    {tab === "lunas" ? formatDate(inv.paid_at, { short: true }) : formatDate(inv.due_date, { short: true })}
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold">{formatRupiah(inv.amount)}</td>
                  <td>
                    <InvoiceStatusBadge invoice={inv} />
                  </td>
                  <td className="text-right">
                    <InvoiceActions invoice={inv} />
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
          <div className="flex justify-end border-t border-stone-100 px-5 py-3 text-sm">
            Total: <span className="ml-2 font-bold">{formatRupiah(total)}</span>
          </div>
        </>
      ) : (
        <EmptyState icon={<Receipt className="size-6" />} title="Tidak ada tagihan" />
      )}
    </Card>
  );
}
