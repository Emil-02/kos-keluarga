"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/form";
import { FileInput } from "@/components/ui/file-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTenantManualAction } from "@/actions/admin/bookings";
import { PERIOD_LABEL, todayISO } from "@/lib/format";
import type { RentPeriod } from "@/lib/types";

type Room = { id: string; number: string; floor: number; note: string | null };

export function ManualTenantForm({ rooms, periods }: { rooms: Room[]; periods: RentPeriod[] }) {
  const [period, setPeriod] = useState<RentPeriod>(periods.includes("bulanan") ? "bulanan" : periods[0]);

  return (
    <ActionForm action={createTenantManualAction} className="grid gap-4 sm:grid-cols-2">
      {(state) => (
        <>
          <Field label="Nama lengkap" htmlFor="m_full_name" required error={state.errors?.full_name}>
            <Input id="m_full_name" name="full_name" required />
          </Field>
          <Field label="No. HP / WhatsApp" htmlFor="m_phone" required error={state.errors?.phone}>
            <Input id="m_phone" name="phone" inputMode="tel" placeholder="08xxxxxxxxxx" required />
          </Field>
          <Field
            label="Email"
            htmlFor="m_email"
            error={state.errors?.email}
            hint="Opsional. Jika kosong, login memakai email otomatis berbasis nomor HP."
          >
            <Input id="m_email" name="email" type="email" />
          </Field>
          <Field label="Kamar" htmlFor="m_room" required error={state.errors?.room_id} hint="Sistem menolak jika kamar bentrok dengan penghuni lain pada tanggal tersebut.">
            <Select id="m_room" name="room_id" required defaultValue="">
              <option value="" disabled>
                — pilih kamar —
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Kamar {r.number} (lantai {r.floor}){r.note ? ` — ${r.note}` : " — kosong"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Periode sewa" htmlFor="m_period" required>
            <Select id="m_period" name="period" value={period} onChange={(e) => setPeriod(e.target.value as RentPeriod)}>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Mulai tagihan"
              htmlFor="m_start"
              required
              error={state.errors?.start_date}
              hint="Penghuni lama: isi tanggal periode tagihan berikutnya."
            >
              <Input id="m_start" name="start_date" type="date" defaultValue={todayISO()} required />
            </Field>
            <Field label={`Durasi awal (${period === "harian" ? "hari" : period === "mingguan" ? "minggu" : "bulan"})`} htmlFor="m_duration" required>
              <Input id="m_duration" name="duration" type="number" min={1} max={365} defaultValue={1} required />
            </Field>
          </div>
          <Field label="Foto KTP (opsional)" htmlFor="m_ktp" className="sm:col-span-2">
            <FileInput id="m_ktp" name="ktp" allowPdf />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Menyimpan…">Tambah penghuni & buat tagihan</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
