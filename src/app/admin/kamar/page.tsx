import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createRoomAction, deleteRoomAction, updateRoomAction } from "@/actions/admin/manage";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayISO } from "@/lib/format";
import type { Room } from "@/lib/types";

export const metadata: Metadata = { title: "Kamar" };

export default async function RoomsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: rooms }, { data: tenancies }] = await Promise.all([
    supabase.from("rooms").select("*").order("floor").order("number"),
    supabase
      .from("tenancies")
      .select("id, room_id, start_date, end_date, paid_until, profiles!tenancies_tenant_id_fkey(full_name)")
      .eq("status", "aktif")
      .order("start_date"),
  ]);

  const byRoom = new Map<string, NonNullable<typeof tenancies>>();
  tenancies?.forEach((t) => byRoom.set(t.room_id, [...(byRoom.get(t.room_id) ?? []), t]));

  const occupiedCount = rooms?.filter((r) => byRoom.get(r.id)?.some((t) => t.start_date <= today)).length ?? 0;

  return (
    <>
      <PageHeader
        title="Kamar"
        description={`${rooms?.length ?? 0} kamar · ${occupiedCount} terisi hari ini. Semua kamar bertipe sama; harga diatur di Pengaturan.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rooms?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {rooms.map((room) => {
                const list = byRoom.get(room.id) ?? [];
                const current = list.find((t) => t.start_date <= today);
                const upcoming = list.filter((t) => t.start_date > today);
                return (
                  <Card key={room.id} className="overflow-hidden">
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div>
                        <p className="text-lg font-bold text-stone-900">Kamar {room.number}</p>
                        <p className="text-xs text-stone-500">Lantai {room.floor}</p>
                      </div>
                      {room.status === "perbaikan" ? (
                        <Badge tone="yellow">Perbaikan</Badge>
                      ) : current ? (
                        <Badge tone="blue">Terisi</Badge>
                      ) : (
                        <Badge tone="green">Kosong</Badge>
                      )}
                    </div>
                    <div className="space-y-1 px-4 pb-3 text-sm">
                      {current ? (
                        <p>
                          <Link href={`/admin/penghuni/${current.id}`} className="font-medium text-brand-700 hover:underline">
                            {current.profiles?.full_name}
                          </Link>
                          <span className="text-stone-500">
                            {" "}
                            · {current.end_date ? `s/d ${formatDate(current.end_date, { short: true })}` : "bulanan/mingguan berjalan"}
                          </span>
                        </p>
                      ) : (
                        <p className="text-stone-500">Belum ada penghuni.</p>
                      )}
                      {upcoming.map((t) => (
                        <p key={t.id} className="text-xs text-stone-500">
                          Dipesan: <Link href={`/admin/penghuni/${t.id}`} className="text-brand-700 hover:underline">{t.profiles?.full_name}</Link> mulai{" "}
                          {formatDate(t.start_date, { short: true })}
                        </p>
                      ))}
                      {room.notes && <p className="text-xs italic text-stone-500">{room.notes}</p>}
                    </div>
                    <details className="border-t border-stone-100 bg-stone-50/60">
                      <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-stone-600">Ubah kamar</summary>
                      <div className="space-y-3 px-4 pb-4">
                        <RoomForm room={room} />
                        <ActionForm action={deleteRoomAction}>
                          <input type="hidden" name="id" value={room.id} />
                          <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm={`Hapus kamar ${room.number}?`}>
                            Hapus kamar
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    </details>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <EmptyState icon={<BedDouble className="size-6" />} title="Belum ada kamar" description="Tambahkan kamar pertama Anda." />
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title={<span className="flex items-center gap-2"><Plus className="size-4" /> Tambah kamar</span>} />
          <CardBody>
            <RoomForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function RoomForm({ room }: { room?: Room }) {
  const prefix = room?.id ?? "new";
  return (
    <ActionForm action={room ? updateRoomAction : createRoomAction} className="space-y-3" resetOnSuccess={!room}>
      {room && <input type="hidden" name="id" value={room.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nomor" htmlFor={`${prefix}-number`} required>
          <Input id={`${prefix}-number`} name="number" defaultValue={room?.number} placeholder="101" required />
        </Field>
        <Field label="Lantai" htmlFor={`${prefix}-floor`}>
          <Input id={`${prefix}-floor`} name="floor" type="number" min={0} defaultValue={room?.floor ?? 1} />
        </Field>
      </div>
      <Field label="Status" htmlFor={`${prefix}-status`} hint="Kamar 'perbaikan' tidak bisa dibooking.">
        <Select id={`${prefix}-status`} name="status" defaultValue={room?.status ?? "aktif"}>
          <option value="aktif">Aktif (bisa disewa)</option>
          <option value="perbaikan">Perbaikan</option>
        </Select>
      </Field>
      <Field label="Catatan" htmlFor={`${prefix}-notes`}>
        <Textarea id={`${prefix}-notes`} name="notes" rows={2} defaultValue={room?.notes ?? ""} />
      </Field>
      <SubmitButton size="sm">{room ? "Simpan" : "Tambah kamar"}</SubmitButton>
    </ActionForm>
  );
}
