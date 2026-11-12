import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Table, TBody, THead } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { InvoiceStatusBadge, INVOICE_TYPE_LABEL } from "@/components/admin/badges";
import { InvoiceActions, PaymentReview } from "@/components/admin/invoice-tools";
import {
  adminExtendAction,
  checkoutAction,
  createInvoiceAction,
  resetTenantPasswordAction,
  updateTenancyAction,
  updateTenantProfileAction,
} from "@/actions/admin/tenancies";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/storage";
import { addPeriod, formatDate, formatRupiah, PERIOD_LABEL, PERIOD_UNIT, todayISO, whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Detail Penghuni" };

export default async function TenancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: tenancy } = await supabase
    .from("tenancies")
    .select("*, rooms(number, floor), profiles!tenancies_tenant_id_fkey(*)")
    .eq("id", id)
    .maybeSingle();
  if (!tenancy || !tenancy.profiles) notFound();
  const tenant = tenancy.profiles;

  const [{ data: invoices }, { data: otherTenancies }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, payments(id, amount, method, paid_on, note, created_at, proof_path, status, admin_note)")
      .eq("tenancy_id", tenancy.id)
      .order("created_at", { ascending: false })
      .order("number", { ascending: false }),
    supabase
      .from("tenancies")
      .select("id, start_date, end_date, status, rooms(number)")
      .eq("tenant_id", tenant.id)
      .neq("id", tenancy.id)
      .order("start_date", { ascending: false }),
  ]);

  const pendingPayments = (invoices ?? []).flatMap((inv) =>
    inv.payments.filter((p) => p.status === "menunggu").map((p) => ({ payment: p, invoice: inv })),
  );
  const urls = await signedUrls([tenant.id_card_path, ...pendingPayments.map((p) => p.payment.proof_path)]);
  const ktpUrl = tenant.id_card_path ? urls[tenant.id_card_path] : null;

  const active = tenancy.status === "aktif";
  const unit = PERIOD_UNIT[tenancy.period];
  const today = todayISO();

  return (
    <>
      <Link href="/admin/penghuni" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" /> Kembali ke daftar penghuni
      </Link>
      <PageHeader
        title={tenant.full_name || "(tanpa nama)"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Kamar {tenancy.rooms?.number} · {PERIOD_LABEL[tenancy.period]}
            <Badge tone={active ? "green" : "gray"}>{active ? "Aktif" : "Sudah keluar"}</Badge>
          </span>
        }
        action={
          tenant.phone && (
            <a
              href={whatsappLink(tenant.phone, `Halo ${tenant.full_name},`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" /> Chat WhatsApp
            </a>
          )
        }
      />

      {pendingPayments.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Bukti pembayaran menunggu verifikasi" />
          <CardBody className="space-y-4">
            {pendingPayments.map(({ payment, invoice }) => (
              <PaymentReview
                key={payment.id}
                payment={payment}
                invoice={invoice}
                proofUrl={payment.proof_path ? urls[payment.proof_path] ?? null : null}
              />
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Tagihan" description="Semua tagihan untuk masa sewa ini." />
            {invoices?.length ? (
              <Table>
                <THead>
                  <tr>
                    <th>Tagihan</th>
                    <th>Jatuh tempo</th>
                    <th className="text-right">Jumlah</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </THead>
                <TBody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <p className="font-medium text-stone-900">{inv.description}</p>
                        <p className="text-xs text-stone-500">
                          {inv.number} · {INVOICE_TYPE_LABEL[inv.type]}
                          {inv.period_start && inv.period_end && (
                            <> · {formatDate(inv.period_start, { short: true })} – {formatDate(addPeriod(inv.period_end, "harian", -1), { short: true })}</>
                          )}
                        </p>
                        {inv.payments
                          .filter((p) => p.status === "ditolak" && p.admin_note)
                          .slice(0, 1)
                          .map((p) => (
                            <p key={p.id} className="mt-1 text-xs text-red-600">
                              Bukti ditolak: {p.admin_note}
                            </p>
                          ))}
                      </td>
                      <td className="whitespace-nowrap">{formatDate(inv.due_date, { short: true })}</td>
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
            ) : (
              <EmptyState title="Belum ada tagihan" />
            )}
          </Card>

          {active && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader title="Tambah tagihan lain" description="Listrik, denda, atau biaya lainnya." />
                <CardBody>
                  <ActionForm action={createInvoiceAction} className="space-y-3" resetOnSuccess>
                    <input type="hidden" name="tenancy_id" value={tenancy.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jenis" htmlFor="inv_type">
                        <Select id="inv_type" name="type" defaultValue="listrik">
                          <option value="listrik">Listrik</option>
                          <option value="denda">Denda</option>
                          <option value="deposit">Deposit</option>
                          <option value="lainnya">Lainnya</option>
                        </Select>
                      </Field>
                      <Field label="Nominal (Rp)" htmlFor="inv_amount">
                        <Input id="inv_amount" name="amount" type="number" min={1000} step={500} required />
                      </Field>
                    </div>
                    <Field label="Keterangan" htmlFor="inv_desc">
                      <Input id="inv_desc" name="description" placeholder="Contoh: Token listrik November" required />
                    </Field>
                    <Field label="Jatuh tempo" htmlFor="inv_due">
                      <Input id="inv_due" name="due_date" type="date" defaultValue={addPeriod(today, "harian", 3)} required />
                    </Field>
                    <Checkbox name="notify" defaultChecked label="Kirim notifikasi ke penghuni" />
                    <SubmitButton size="sm">Buat tagihan</SubmitButton>
                  </ActionForm>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Perpanjang / bayar di muka"
                  description={`Buat tagihan sewa untuk beberapa ${unit} berikutnya.`}
                />
                <CardBody>
                  <ActionForm action={adminExtendAction} className="space-y-3">
                    <input type="hidden" name="tenancy_id" value={tenancy.id} />
                    <Field label={`Jumlah ${unit}`} htmlFor="ext_periods" hint={`${formatRupiah(tenancy.price)} per ${unit}`}>
                      <Input id="ext_periods" name="periods" type="number" min={1} max={60} defaultValue={1} required />
                    </Field>
                    <Checkbox name="notify" defaultChecked label="Kirim notifikasi ke penghuni" />
                    <SubmitButton size="sm">Buat tagihan perpanjangan</SubmitButton>
                  </ActionForm>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Masa sewa" />
            <CardBody className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Mulai" value={formatDate(tenancy.start_date)} />
                <Info
                  label="Lunas sampai"
                  value={tenancy.paid_until > tenancy.start_date ? formatDate(addPeriod(tenancy.paid_until, "harian", -1)) : "Belum ada"}
                />
                <Info
                  label="Berakhir"
                  value={tenancy.end_date ? formatDate(tenancy.end_date) : "Berjalan (otomatis diperpanjang)"}
                />
                <Info label="Harga" value={`${formatRupiah(tenancy.price)} / ${unit}`} />
                {tenancy.deposit > 0 && <Info label="Deposit" value={formatRupiah(tenancy.deposit)} />}
              </dl>

              {active && (
                <ActionForm action={updateTenancyAction} className="space-y-3 border-t border-stone-100 pt-4">
                  <input type="hidden" name="tenancy_id" value={tenancy.id} />
                  <Field label={`Harga per ${unit} (Rp)`} htmlFor="t_price" hint="Berlaku untuk tagihan berikutnya">
                    <Input id="t_price" name="price" type="number" min={1000} step={1000} defaultValue={tenancy.price} required />
                  </Field>
                  <Checkbox name="auto_renew" defaultChecked={tenancy.auto_renew} label="Buat tagihan berikutnya otomatis" />
                  <Field label="Catatan internal" htmlFor="t_notes">
                    <Textarea id="t_notes" name="notes" rows={2} defaultValue={tenancy.notes ?? ""} />
                  </Field>
                  <SubmitButton size="sm" variant="secondary">
                    Simpan
                  </SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>

          {active && (
            <Card className="border-red-200">
              <CardHeader title="Check-out" description="Akhiri sewa. Tagihan sewa setelah tanggal ini dibatalkan otomatis." />
              <CardBody>
                <ActionForm action={checkoutAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="tenancy_id" value={tenancy.id} />
                  <Field label="Tanggal keluar" htmlFor="co_date" className="flex-1">
                    <Input
                      id="co_date"
                      name="date"
                      type="date"
                      defaultValue={tenancy.paid_until > tenancy.start_date ? tenancy.paid_until : today}
                      required
                    />
                  </Field>
                  <SubmitButton variant="danger" confirm="Yakin melakukan check-out penghuni ini?">
                    Check-out
                  </SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Data penghuni" />
            <CardBody className="space-y-4">
              <p className="text-sm">
                <span className="text-stone-500">Email login: </span>
                <span className="font-medium">{tenant.email}</span>
              </p>
              <ActionForm action={updateTenantProfileAction} className="space-y-3">
                <input type="hidden" name="profile_id" value={tenant.id} />
                <input type="hidden" name="tenancy_id" value={tenancy.id} />
                <Field label="Nama lengkap" htmlFor="p_name">
                  <Input id="p_name" name="full_name" defaultValue={tenant.full_name} required />
                </Field>
                <Field label="No. HP / WhatsApp" htmlFor="p_phone">
                  <Input id="p_phone" name="phone" defaultValue={tenant.phone ?? ""} />
                </Field>
                <Field label="Alamat asal" htmlFor="p_address">
                  <Textarea id="p_address" name="address" rows={2} defaultValue={tenant.address ?? ""} />
                </Field>
                <SubmitButton size="sm" variant="secondary">
                  Simpan data
                </SubmitButton>
              </ActionForm>

              <div className="border-t border-stone-100 pt-4">
                <p className="mb-2 text-sm font-medium text-stone-700">Foto KTP</p>
                {ktpUrl ? (
                  <a href={ktpUrl} target="_blank" rel="noreferrer">
                    {tenant.id_card_path?.endsWith(".pdf") ? (
                      <span className="text-sm font-semibold text-brand-700 hover:underline">Buka dokumen KTP</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ktpUrl} alt="KTP penghuni" className="max-h-40 rounded-xl border border-stone-200" />
                    )}
                  </a>
                ) : (
                  <p className="text-sm text-stone-500">Belum ada.</p>
                )}
              </div>

              <ActionForm action={resetTenantPasswordAction} className="border-t border-stone-100 pt-4">
                <input type="hidden" name="profile_id" value={tenant.id} />
                <SubmitButton size="sm" variant="outline" confirm="Buat password sementara baru dan kirim ke penghuni?">
                  Reset password portal
                </SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>

          {otherTenancies && otherTenancies.length > 0 && (
            <Card>
              <CardHeader title="Riwayat sewa lain" />
              <ul className="divide-y divide-stone-100 text-sm">
                {otherTenancies.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/penghuni/${t.id}`} className="block px-5 py-3 hover:bg-stone-50">
                      Kamar {t.rooms?.number} · {formatDate(t.start_date, { short: true })} –{" "}
                      {t.end_date ? formatDate(t.end_date, { short: true }) : "sekarang"}
                      <Badge tone={t.status === "aktif" ? "green" : "gray"} className="ml-2">
                        {t.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-stone-800">{value}</dd>
    </div>
  );
}
