import type { Metadata } from "next";
import Image from "next/image";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table, TBody, THead } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { FileInput } from "@/components/ui/file-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSettingsAction } from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, publicImageUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [settings, { data: logs }] = await Promise.all([
    getSettings(),
    supabase.from("notifications_log").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  const qrisUrl = publicImageUrl(settings.qris_path);
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const waReady = Boolean(process.env.FONNTE_TOKEN);

  return (
    <>
      <PageHeader title="Pengaturan" description="Informasi kos, harga sewa, dan metode pembayaran. Perubahan langsung tampil di website." />

      <ActionForm action={updateSettingsAction} className="space-y-6">
        <Card>
          <CardHeader title="Informasi kos" />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Nama kos" htmlFor="kos_name" required>
              <Input id="kos_name" name="kos_name" defaultValue={settings.kos_name} required />
            </Field>
            <Field label="Slogan" htmlFor="tagline">
              <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
            </Field>
            <Field label="Deskripsi" htmlFor="description" className="md:col-span-2">
              <Textarea id="description" name="description" rows={4} defaultValue={settings.description} />
            </Field>
            <Field label="Alamat lengkap" htmlFor="address" className="md:col-span-2">
              <Textarea id="address" name="address" rows={2} defaultValue={settings.address} />
            </Field>
            <Field label="No. WhatsApp pengelola" htmlFor="whatsapp" required hint="Untuk tombol chat & notifikasi admin">
              <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp} placeholder="08xxxxxxxxxx" required />
            </Field>
            <Field label="Email pengelola" htmlFor="email" hint="Untuk notifikasi booking & pembayaran baru">
              <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
            </Field>
            <Field
              label="Google Maps (embed)"
              htmlFor="maps_embed_url"
              className="md:col-span-2"
              hint="Buka Google Maps → Bagikan → Sematkan peta → salin kode HTML dan tempel di sini."
            >
              <Input id="maps_embed_url" name="maps_embed_url" defaultValue={settings.maps_embed_url ?? ""} placeholder='<iframe src="https://www.google.com/maps/embed?..."' />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Harga sewa" description="Isi 0 untuk menyembunyikan periode sewa tersebut." />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Harian (Rp)" htmlFor="price_daily">
              <Input id="price_daily" name="price_daily" type="number" min={0} step={1000} defaultValue={settings.price_daily} />
            </Field>
            <Field label="Mingguan (Rp)" htmlFor="price_weekly">
              <Input id="price_weekly" name="price_weekly" type="number" min={0} step={1000} defaultValue={settings.price_weekly} />
            </Field>
            <Field label="Bulanan (Rp)" htmlFor="price_monthly">
              <Input id="price_monthly" name="price_monthly" type="number" min={0} step={1000} defaultValue={settings.price_monthly} />
            </Field>
            <Field label="Deposit bulanan (Rp)" htmlFor="deposit" hint="Ditagih sekali di awal sewa bulanan">
              <Input id="deposit" name="deposit" type="number" min={0} step={1000} defaultValue={settings.deposit} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Kamar & peraturan" />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Ukuran kamar" htmlFor="room_size">
              <Input id="room_size" name="room_size" defaultValue={settings.room_size ?? ""} placeholder="3 x 4 meter" />
            </Field>
            <div className="hidden md:block" />
            <Field label="Isi / fasilitas kamar" htmlFor="room_features" hint="Satu item per baris">
              <Textarea id="room_features" name="room_features" rows={8} defaultValue={settings.room_features.join("\n")} />
            </Field>
            <Field label="Peraturan kos" htmlFor="rules" hint="Satu peraturan per baris">
              <Textarea id="rules" name="rules" rows={8} defaultValue={settings.rules.join("\n")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pembayaran" description="Ditampilkan ke penghuni di halaman tagihan." />
          <CardBody className="grid gap-4 md:grid-cols-3">
            <Field label="Nama bank" htmlFor="bank_name">
              <Input id="bank_name" name="bank_name" defaultValue={settings.bank_name ?? ""} placeholder="BCA / BRI / Mandiri" />
            </Field>
            <Field label="Nomor rekening" htmlFor="bank_account_number">
              <Input id="bank_account_number" name="bank_account_number" defaultValue={settings.bank_account_number ?? ""} />
            </Field>
            <Field label="Atas nama" htmlFor="bank_account_name">
              <Input id="bank_account_name" name="bank_account_name" defaultValue={settings.bank_account_name ?? ""} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Gambar QRIS" htmlFor="qris" hint="Opsional. JPG/PNG, akan ditampilkan ke penghuni.">
                <div className="flex flex-wrap items-start gap-4">
                  {qrisUrl && (
                    <div className="space-y-2">
                      <Image src={qrisUrl} alt="QRIS" width={140} height={140} className="rounded-xl border border-stone-200 bg-white object-contain" />
                      <Checkbox name="remove_qris" label="Hapus QRIS" />
                    </div>
                  )}
                  <div className="min-w-64 flex-1">
                    <FileInput id="qris" name="qris" />
                  </div>
                </div>
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <SubmitButton size="lg" pendingText="Menyimpan…" className="shadow-lg">
            Simpan pengaturan
          </SubmitButton>
        </div>
      </ActionForm>

      <Card className="mt-10">
        <CardHeader
          title="Notifikasi WhatsApp & email"
          description={
            <span className="flex flex-wrap gap-2 pt-1">
              <Badge tone={waReady ? "green" : "yellow"}>WhatsApp (Fonnte): {waReady ? "aktif" : "belum diatur"}</Badge>
              <Badge tone={emailReady ? "green" : "yellow"}>Email (Resend): {emailReady ? "aktif" : "belum diatur"}</Badge>
            </span>
          }
        />
        <CardBody className="text-sm text-stone-600">
          Atur <code className="rounded bg-stone-100 px-1">FONNTE_TOKEN</code>, <code className="rounded bg-stone-100 px-1">RESEND_API_KEY</code>, dan{" "}
          <code className="rounded bg-stone-100 px-1">EMAIL_FROM</code> di environment variables hosting. Selama belum diatur, pesan dicatat
          sebagai &quot;dilewati&quot; di bawah ini.
        </CardBody>
        {logs && logs.length > 0 && (
          <Table>
            <THead>
              <tr>
                <th>Waktu</th>
                <th>Kanal</th>
                <th>Penerima</th>
                <th>Jenis</th>
                <th>Status</th>
              </tr>
            </THead>
            <TBody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(log.created_at)}</td>
                  <td>{log.channel === "whatsapp" ? "WhatsApp" : "Email"}</td>
                  <td className="text-xs">{log.recipient}</td>
                  <td className="text-xs">{log.kind}</td>
                  <td>
                    <Badge tone={log.status === "terkirim" ? "green" : log.status === "gagal" ? "red" : "gray"} title={log.error ?? undefined}>
                      {log.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
