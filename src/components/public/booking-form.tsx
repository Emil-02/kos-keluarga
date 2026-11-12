"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { createBookingAction } from "@/actions/booking";
import { ActionForm } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/card";
import { FileInput } from "@/components/ui/file-input";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_DURATION, PERIOD_DESCRIPTION } from "@/components/public/periods";
import { cn } from "@/lib/cn";
import { addPeriod, formatDate, formatRupiah, PERIOD_LABEL, PERIOD_UNIT } from "@/lib/format";
import type { RentPeriod } from "@/lib/types";

type Props = {
  options: { period: RentPeriod; price: number }[];
  deposit: number;
  today: string;
  maxStart: string;
  defaultPeriod?: RentPeriod;
  availableNow: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function BookingForm({ options, deposit, today, maxStart, defaultPeriod, availableNow }: Props) {
  const initialPeriod =
    options.find((o) => o.period === defaultPeriod)?.period ??
    options.find((o) => o.period === "bulanan")?.period ??
    options[0].period;
  const [period, setPeriod] = useState<RentPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState(today);
  const [duration, setDuration] = useState(1);

  const price = options.find((o) => o.period === period)?.price ?? 0;
  const maxDuration = MAX_DURATION[period];
  const unit = PERIOD_UNIT[period];
  const rent = price * duration;
  const depositAmount = period === "bulanan" ? deposit : 0;
  const total = rent + depositAmount;
  const validStart = ISO_DATE.test(startDate) && startDate >= today;
  const endDate = validStart ? addPeriod(startDate, period, duration) : null;

  function changePeriod(next: RentPeriod) {
    setPeriod(next);
    setDuration((d) => Math.min(d, MAX_DURATION[next]));
  }

  return (
    <ActionForm action={createBookingAction} showMessage={false} className="relative">
      {(state) => (
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <div className="space-y-6 lg:col-span-2">
            {/* Data diri */}
            <fieldset className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <legend className="sr-only">Data diri</legend>
              <h2 className="flex items-center gap-2 font-bold text-stone-900">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">1</span>
                Data diri
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Nama lengkap (sesuai KTP)" htmlFor="full_name" error={state.errors?.full_name} required className="sm:col-span-2">
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    minLength={3}
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Nama lengkap"
                    aria-invalid={!!state.errors?.full_name}
                  />
                </Field>
                <Field label="Nomor WhatsApp" htmlFor="phone" error={state.errors?.phone} hint="Kami akan menghubungi Anda lewat nomor ini." required>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    autoComplete="tel"
                    placeholder="081234567890"
                    aria-invalid={!!state.errors?.phone}
                  />
                </Field>
                <Field label="Email" htmlFor="email" error={state.errors?.email} hint="Untuk info akun portal & tagihan." required>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={120}
                    autoComplete="email"
                    placeholder="nama@email.com"
                    aria-invalid={!!state.errors?.email}
                  />
                </Field>
              </div>
            </fieldset>

            {/* Detail sewa */}
            <fieldset className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <legend className="sr-only">Detail sewa</legend>
              <h2 className="flex items-center gap-2 font-bold text-stone-900">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">2</span>
                Detail sewa
              </h2>

              <div className="mt-5" role="radiogroup" aria-label="Periode sewa">
                <p className="mb-1.5 text-sm font-medium text-stone-700">
                  Periode sewa<span className="ml-0.5 text-red-500">*</span>
                </p>
                <div className={cn("grid gap-3", options.length > 1 && "sm:grid-cols-3")}>
                  {options.map((o) => {
                    const selected = o.period === period;
                    return (
                      <label
                        key={o.period}
                        className={cn(
                          "relative flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition has-focus-visible:ring-3 has-focus-visible:ring-brand-500/30",
                          selected ? "border-brand-600 bg-brand-50" : "border-stone-200 bg-white hover:border-brand-300",
                        )}
                      >
                        <input
                          type="radio"
                          name="period"
                          value={o.period}
                          checked={selected}
                          onChange={() => changePeriod(o.period)}
                          className="sr-only"
                        />
                        {selected && <CheckCircle2 className="absolute top-3 right-3 size-5 text-brand-600" aria-hidden />}
                        <span className="text-sm font-semibold text-stone-900">{PERIOD_LABEL[o.period]}</span>
                        <span className="mt-1 text-lg font-extrabold text-brand-700">
                          {formatRupiah(o.price)}
                          <span className="text-xs font-medium text-stone-500">/{PERIOD_UNIT[o.period]}</span>
                        </span>
                        <span className="mt-1 text-xs text-stone-500">{PERIOD_DESCRIPTION[o.period]}</span>
                      </label>
                    );
                  })}
                </div>
                {state.errors?.period && <p className="mt-1 text-xs font-medium text-red-600">{state.errors.period[0]}</p>}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label={period === "harian" ? "Tanggal check-in" : "Tanggal mulai"} htmlFor="start_date" error={state.errors?.start_date} required>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    min={today}
                    max={maxStart}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-invalid={!!state.errors?.start_date}
                  />
                </Field>
                <Field
                  label={period === "harian" ? "Lama menginap" : "Bayar di muka"}
                  htmlFor="duration"
                  error={state.errors?.duration}
                  hint={`Maksimal ${maxDuration} ${unit}`}
                  required
                >
                  <Select
                    id="duration"
                    name="duration"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    aria-invalid={!!state.errors?.duration}
                  >
                    {Array.from({ length: maxDuration }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {unit}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Jumlah penghuni" htmlFor="occupants" error={state.errors?.occupants} hint="Maksimal 2 orang" required>
                  <Select id="occupants" name="occupants" defaultValue="1">
                    <option value="1">1 orang</option>
                    <option value="2">2 orang</option>
                  </Select>
                </Field>
              </div>

              <Field label="Catatan (opsional)" htmlFor="note" error={state.errors?.note} className="mt-4">
                <Textarea
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: perkiraan jam kedatangan, membawa motor, dll."
                />
              </Field>
            </fieldset>

            {/* Dokumen */}
            <fieldset className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <legend className="sr-only">Dokumen dan persetujuan</legend>
              <h2 className="flex items-center gap-2 font-bold text-stone-900">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">3</span>
                Dokumen & persetujuan
              </h2>
              <Field
                label="Foto KTP"
                htmlFor="id_card"
                error={state.errors?.id_card}
                hint="Format JPG/PNG/WEBP. Foto otomatis diperkecil sebelum dikirim."
                required
                className="mt-5"
              >
                <FileInput id="id_card" name="id_card" required aria-invalid={!!state.errors?.id_card} />
              </Field>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-stone-500">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                Foto KTP disimpan secara privat dan hanya dapat dilihat oleh pengelola.
              </p>

              <div className="mt-5">
                <Checkbox
                  name="agree"
                  required
                  label={
                    <span>
                      Saya telah membaca dan menyetujui{" "}
                      <Link href="/peraturan" target="_blank" className="font-semibold text-brand-700 underline">
                        peraturan kos
                      </Link>
                      .
                    </span>
                  }
                />
                {state.errors?.agree && <p className="mt-1 text-xs font-medium text-red-600">{state.errors.agree[0]}</p>}
              </div>

              {/* honeypot anti-spam: disembunyikan dari pengguna */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>
            </fieldset>
          </div>

          {/* Ringkasan */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-brand-700 to-brand-800 px-5 py-4 text-white">
                <p className="text-sm text-brand-100">Estimasi pembayaran awal</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatRupiah(total)}</p>
              </div>
              <dl className="space-y-2.5 px-5 py-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500">Sewa {PERIOD_LABEL[period].toLowerCase()}</dt>
                  <dd className="text-right font-medium text-stone-800">
                    {formatRupiah(price)} × {duration} {unit}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500">Subtotal sewa</dt>
                  <dd className="font-medium text-stone-800">{formatRupiah(rent)}</dd>
                </div>
                {depositAmount > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-stone-500">
                      Deposit
                      <span className="block text-xs">dikembalikan saat keluar</span>
                    </dt>
                    <dd className="font-medium text-stone-800">{formatRupiah(depositAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-stone-100 pt-2.5">
                  <dt className="font-semibold text-stone-900">Total</dt>
                  <dd className="font-bold text-stone-900">{formatRupiah(total)}</dd>
                </div>
              </dl>
              <div className="border-t border-stone-100 bg-stone-50 px-5 py-4 text-sm text-stone-600">
                <p className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  {endDate ? (
                    period === "harian" ? (
                      <span>
                        Check-in <strong className="text-stone-800">{formatDate(startDate)}</strong>, check-out{" "}
                        <strong className="text-stone-800">{formatDate(endDate)}</strong>.
                      </span>
                    ) : (
                      <span>
                        Mulai <strong className="text-stone-800">{formatDate(startDate)}</strong>. Pembayaran awal mencakup sampai{" "}
                        <strong className="text-stone-800">{formatDate(addPeriod(endDate, "harian", -1))}</strong>; setelah itu sewa berjalan & diperpanjang
                        otomatis per {unit} hingga Anda check-out.
                      </span>
                    )
                  ) : (
                    <span>Pilih tanggal mulai untuk melihat rincian.</span>
                  )}
                </p>
              </div>
            </div>

            {availableNow > 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                {availableNow} kamar tersedia hari ini
              </p>
            ) : (
              <Alert tone="warning">
                Saat ini semua kamar sedang terisi. Anda tetap dapat booking untuk tanggal mendatang — sistem akan mengecek
                ketersediaan untuk tanggal yang Anda pilih.
              </Alert>
            )}

            {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}

            <SubmitButton variant="accent" size="lg" className="w-full" pendingText="Mengirim booking…">
              Kirim booking
            </SubmitButton>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Belum perlu membayar sekarang. Pengelola akan mengonfirmasi via WhatsApp, lalu tagihan dikirim setelah booking
              disetujui.
            </p>
          </aside>
        </div>
      )}
    </ActionForm>
  );
}
