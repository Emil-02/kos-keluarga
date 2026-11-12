import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { BookingStatusBadge } from "@/components/admin/badges";
import { approveBookingAction, rejectBookingAction } from "@/actions/admin/bookings";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { formatDate, formatDateTime, formatRupiah, PERIOD_LABEL, PERIOD_UNIT, whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Detail Booking" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase.from("bookings").select("*, rooms(number)").eq("id", id).maybeSingle();
  if (!booking) notFound();

  const settings = await getSettings();
  const isFixedEnd = booking.period === "harian";
  const { data: availableRooms } =
    booking.status === "menunggu"
      ? await supabase.rpc("available_rooms", {
          p_start: booking.start_date,
          p_end: (isFixedEnd ? booking.end_date : null) as string,
        })
      : { data: [] };

  const ktpUrl = await signedUrl(booking.id_card_path);
  const price =
    booking.period === "harian" ? settings.price_daily : booking.period === "mingguan" ? settings.price_weekly : settings.price_monthly;
  const deposit = booking.period === "bulanan" ? settings.deposit : 0;

  return (
    <>
      <Link href="/admin/booking" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" /> Kembali ke daftar booking
      </Link>
      <PageHeader
        title={booking.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Kode {booking.code} · masuk {formatDateTime(booking.created_at)} <BookingStatusBadge status={booking.status} />
          </span>
        }
        action={
          <a
            href={whatsappLink(booking.phone, `Halo ${booking.full_name}, kami dari ${settings.kos_name} terkait booking ${booking.code}.`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="size-4" /> Chat WhatsApp
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Data pemesan" />
            <CardBody>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Nama lengkap" value={booking.full_name} />
                <Info label="No. HP / WhatsApp" value={booking.phone} />
                <Info label="Email" value={booking.email} />
                <Info label="Jumlah penghuni" value={`${booking.occupants} orang`} />
                <Info label="Periode sewa" value={`${PERIOD_LABEL[booking.period]} · ${booking.duration} ${PERIOD_UNIT[booking.period]}`} />
                <Info
                  label="Tanggal"
                  value={
                    isFixedEnd
                      ? `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)}`
                      : `Mulai ${formatDate(booking.start_date)} (diperpanjang otomatis)`
                  }
                />
                <Info
                  label="Estimasi tagihan awal"
                  value={`${formatRupiah(price * booking.duration)}${deposit ? ` + deposit ${formatRupiah(deposit)}` : ""}`}
                />
                {booking.rooms && <Info label="Kamar" value={booking.rooms.number} />}
              </dl>
              {booking.note && (
                <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
                  <p className="font-medium text-stone-700">Catatan pemesan</p>
                  <p className="mt-1 whitespace-pre-line text-stone-600">{booking.note}</p>
                </div>
              )}
              {booking.admin_note && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-800">Catatan admin</p>
                  <p className="mt-1 whitespace-pre-line text-amber-900">{booking.admin_note}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Foto KTP" description="Hanya dapat dilihat oleh admin (tautan berlaku 1 jam)." />
            <CardBody>
              {ktpUrl ? (
                <a href={ktpUrl} target="_blank" rel="noreferrer" className="group block">
                  {booking.id_card_path?.endsWith(".pdf") ? (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                      <ExternalLink className="size-4" /> Buka dokumen KTP (PDF)
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ktpUrl} alt="Foto KTP pemesan" className="max-h-80 rounded-xl border border-stone-200 object-contain group-hover:opacity-90" />
                  )}
                </a>
              ) : (
                <p className="text-sm text-stone-500">Tidak ada foto KTP.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {booking.status === "menunggu" ? (
            <>
              <Card>
                <CardHeader title="Setujui booking" description="Akun portal & tagihan pertama dibuat otomatis." />
                <CardBody>
                  {availableRooms && availableRooms.length > 0 ? (
                    <ActionForm action={approveBookingAction} className="space-y-4">
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <Field label="Pilih kamar" htmlFor="room_id" required hint={`${availableRooms.length} kamar kosong untuk tanggal ini`}>
                        <Select id="room_id" name="room_id" required defaultValue="">
                          <option value="" disabled>
                            — pilih kamar —
                          </option>
                          {availableRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Kamar {r.number} (lantai {r.floor})
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Catatan (opsional)" htmlFor="approve_note">
                        <Textarea id="approve_note" name="admin_note" rows={2} />
                      </Field>
                      <SubmitButton className="w-full" pendingText="Memproses…">
                        Setujui & kirim tagihan
                      </SubmitButton>
                    </ActionForm>
                  ) : (
                    <Alert tone="warning">
                      Tidak ada kamar kosong untuk tanggal tersebut. Hubungi pemesan untuk mengganti tanggal atau tolak booking.
                    </Alert>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Tolak / batalkan" />
                <CardBody>
                  <ActionForm action={rejectBookingAction} className="space-y-4">
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <Field label="Alasan (dikirim ke pemesan)" htmlFor="reject_note">
                      <Textarea id="reject_note" name="admin_note" rows={2} placeholder="Contoh: kamar penuh pada tanggal tersebut" />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <SubmitButton name="status" value="ditolak" variant="danger" confirm="Tolak booking ini?">
                        Tolak
                      </SubmitButton>
                      <SubmitButton name="status" value="dibatalkan" variant="outline" confirm="Tandai booking ini dibatalkan (tanpa notifikasi)?">
                        Batalkan
                      </SubmitButton>
                    </div>
                  </ActionForm>
                </CardBody>
              </Card>
            </>
          ) : booking.status === "disetujui" && booking.tenancy_id ? (
            <Card>
              <CardBody>
                <p className="text-sm text-stone-600">Booking ini sudah disetujui pada {formatDateTime(booking.decided_at)}.</p>
                <Link href={`/admin/penghuni/${booking.tenancy_id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
                  Lihat data penghuni & tagihan →
                </Link>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-stone-600">Booking ini sudah diproses pada {formatDateTime(booking.decided_at)}.</p>
              </CardBody>
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
