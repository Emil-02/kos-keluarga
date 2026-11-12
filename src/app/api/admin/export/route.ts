import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addPeriod, todayISO } from "@/lib/format";

function csvCell(value: string | number | null | undefined) {
  const s = String(value ?? "");
  // cegah formula injection di Excel/Sheets
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Ekspor pemasukan & pengeluaran satu bulan sebagai CSV. */
export async function GET(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const bulan = request.nextUrl.searchParams.get("bulan");
  const month = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : todayISO().slice(0, 7);
  const start = `${month}-01`;
  const end = addPeriod(start, "bulanan", 1);

  const supabase = await createClient();
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, method, paid_on, invoices!inner(number, type, description, tenancies!inner(rooms(number), profiles!tenancies_tenant_id_fkey(full_name)))")
      .eq("status", "diterima")
      .gte("paid_on", start)
      .lt("paid_on", end)
      .order("paid_on"),
    supabase.from("expenses").select("*").gte("spent_on", start).lt("spent_on", end).order("spent_on"),
  ]);

  const rows: (string | number | null)[][] = [["Tanggal", "Jenis", "Kategori", "Keterangan", "Penghuni", "Kamar", "No. Tagihan", "Metode", "Pemasukan", "Pengeluaran"]];
  payments?.forEach((p) =>
    rows.push([
      p.paid_on,
      "Pemasukan",
      p.invoices.type,
      p.invoices.description,
      p.invoices.tenancies.profiles?.full_name ?? "",
      p.invoices.tenancies.rooms?.number ?? "",
      p.invoices.number,
      p.method,
      p.amount,
      "",
    ]),
  );
  expenses?.forEach((e) => rows.push([e.spent_on, "Pengeluaran", e.category, e.description, "", "", "", "", "", e.amount]));

  const income = payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const spent = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  rows.push([], ["", "", "", "TOTAL", "", "", "", "", income, spent], ["", "", "", "LABA BERSIH", "", "", "", "", income - spent, ""]);

  // BOM agar Excel membaca UTF-8 dengan benar
  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keuangan-kos-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
