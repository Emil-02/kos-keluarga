import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard, Table, TBody, THead } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import { INVOICE_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/components/admin/badges";
import { createExpenseAction, deleteExpenseAction } from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addPeriod, formatDate, formatRupiah, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Keuangan" };

const EXPENSE_CATEGORIES = ["Listrik", "Air", "Internet", "Kebersihan", "Perbaikan", "Gaji", "Pajak", "Lainnya"];

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  await requireAdmin();
  const { bulan } = await searchParams;
  const today = todayISO();
  const month = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : today.slice(0, 7);
  const start = `${month}-01`;
  const end = addPeriod(start, "bulanan", 1);
  const prevMonth = addPeriod(start, "bulanan", -1).slice(0, 7);
  const nextMonth = end.slice(0, 7);
  const sixMonthsAgo = addPeriod(start, "bulanan", -5);

  const supabase = await createClient();
  const [{ data: payments }, { data: expenses }, { data: histPayments }, { data: histExpenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, method, paid_on, invoices!inner(number, type, description, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name)))")
      .eq("status", "diterima")
      .gte("paid_on", start)
      .lt("paid_on", end)
      .order("paid_on"),
    supabase.from("expenses").select("*").gte("spent_on", start).lt("spent_on", end).order("spent_on"),
    supabase.from("payments").select("amount, paid_on").eq("status", "diterima").gte("paid_on", sixMonthsAgo).lt("paid_on", end),
    supabase.from("expenses").select("amount, spent_on").gte("spent_on", sixMonthsAgo).lt("spent_on", end),
  ]);

  const income = payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const spent = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const byType = new Map<string, number>();
  payments?.forEach((p) => byType.set(p.invoices.type, (byType.get(p.invoices.type) ?? 0) + p.amount));

  const months = Array.from({ length: 6 }, (_, i) => addPeriod(sixMonthsAgo, "bulanan", i).slice(0, 7));
  const history = months.map((m) => ({
    month: m,
    income: histPayments?.filter((p) => p.paid_on.startsWith(m)).reduce((s, p) => s + p.amount, 0) ?? 0,
    expense: histExpenses?.filter((e) => e.spent_on.startsWith(m)).reduce((s, e) => s + e.amount, 0) ?? 0,
  }));
  const maxValue = Math.max(1, ...history.flatMap((h) => [h.income, h.expense]));

  return (
    <>
      <PageHeader
        title="Keuangan"
        description="Pemasukan dari pembayaran yang diterima dan pengeluaran operasional."
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/keuangan?bulan=${prevMonth}`} className={buttonClass("outline", "sm")} aria-label="Bulan sebelumnya">
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-36 text-center font-semibold capitalize">{monthLabel(month)}</span>
            <Link href={`/admin/keuangan?bulan=${nextMonth}`} className={buttonClass("outline", "sm")} aria-label="Bulan berikutnya">
              <ChevronRight className="size-4" />
            </Link>
            <a href={`/api/admin/export?bulan=${month}`} className={buttonClass("secondary", "sm")}>
              <Download className="size-4" /> CSV
            </a>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pemasukan" value={formatRupiah(income)} hint={`${payments?.length ?? 0} pembayaran`} tone="brand" />
        <StatCard label="Pengeluaran" value={formatRupiah(spent)} hint={`${expenses?.length ?? 0} transaksi`} tone="red" />
        <StatCard label="Laba bersih" value={formatRupiah(income - spent)} tone={income - spent >= 0 ? "sky" : "red"} />
      </div>

      <Card className="mt-6">
        <CardHeader title="6 bulan terakhir" />
        <CardBody>
          <div className="flex h-48 items-end gap-3">
            {history.map((h) => (
              <div key={h.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/3 rounded-t-md bg-brand-500"
                    style={{ height: `${(h.income / maxValue) * 100}%` }}
                    title={`Pemasukan ${formatRupiah(h.income)}`}
                  />
                  <div
                    className="w-1/3 rounded-t-md bg-red-400"
                    style={{ height: `${(h.expense / maxValue) * 100}%` }}
                    title={`Pengeluaran ${formatRupiah(h.expense)}`}
                  />
                </div>
                <span className="text-xs capitalize text-stone-500">{monthLabel(h.month).split(" ")[0].slice(0, 3)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-brand-500" /> Pemasukan
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-red-400" /> Pengeluaran
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Pemasukan"
            description={[...byType.entries()].map(([t, v]) => `${INVOICE_TYPE_LABEL[t as keyof typeof INVOICE_TYPE_LABEL]} ${formatRupiah(v)}`).join(" · ") || undefined}
          />
          {payments?.length ? (
            <Table>
              <THead>
                <tr>
                  <th>Tanggal</th>
                  <th>Penghuni</th>
                  <th>Keterangan</th>
                  <th className="text-right">Jumlah</th>
                </tr>
              </THead>
              <TBody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDate(p.paid_on, { short: true })}</td>
                    <td>
                      {p.invoices.tenancies.profiles?.full_name}
                      <p className="text-xs text-stone-500">Kamar {p.invoices.tenancies.rooms?.number}</p>
                    </td>
                    <td>
                      {p.invoices.description}
                      <p className="text-xs text-stone-500">{PAYMENT_METHOD_LABEL[p.method]}</p>
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold">{formatRupiah(p.amount)}</td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState title="Belum ada pemasukan bulan ini" />
          )}
        </Card>

        <Card>
          <CardHeader title="Pengeluaran" />
          <CardBody className="border-b border-stone-100">
            <ActionForm action={createExpenseAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
              <Field label="Kategori" htmlFor="e_cat">
                <Input id="e_cat" name="category" list="expense-categories" required />
                <datalist id="expense-categories">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Nominal (Rp)" htmlFor="e_amount">
                <Input id="e_amount" name="amount" type="number" min={100} required />
              </Field>
              <Field label="Tanggal" htmlFor="e_date">
                <Input id="e_date" name="spent_on" type="date" defaultValue={month === today.slice(0, 7) ? today : start} required />
              </Field>
              <Field label="Keterangan" htmlFor="e_desc">
                <Input id="e_desc" name="description" />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton size="sm">Catat pengeluaran</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
          {expenses?.length ? (
            <Table>
              <TBody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">{formatDate(e.spent_on, { short: true })}</td>
                    <td>
                      <span className="font-medium">{e.category}</span>
                      {e.description && <p className="text-xs text-stone-500">{e.description}</p>}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold">{formatRupiah(e.amount)}</td>
                    <td className="w-px">
                      <ActionForm action={deleteExpenseAction} showMessage={false}>
                        <input type="hidden" name="id" value={e.id} />
                        <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Hapus pengeluaran ini?">
                          Hapus
                        </SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState title="Belum ada pengeluaran bulan ini" />
          )}
        </Card>
      </div>
    </>
  );
}
