"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { extendTenancyAction } from "@/actions/tenant";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_EXTEND_PERIODS } from "@/components/tenant/constants";
import { addPeriod, formatDate, formatRupiah, PERIOD_UNIT, periodEndAfter } from "@/lib/format";
import type { RentPeriod } from "@/lib/types";

type Props = {
  tenancyId: string;
  period: RentPeriod;
  price: number;
  /** Tanggal mulai sewa (patokan perhitungan periode bulanan). */
  startDate: string;
  /** Tanggal mulai periode berikutnya yang belum ditagih. */
  nextStart: string | null;
};

export function ExtendForm({ tenancyId, period, price, startDate, nextStart }: Props) {
  const [periods, setPeriods] = useState(1);
  const max = MAX_EXTEND_PERIODS[period];
  const unit = PERIOD_UNIT[period];
  const end = nextStart ? periodEndAfter(startDate, period, nextStart, periods) : null;

  return (
    <ActionForm action={extendTenancyAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="tenancy_id" value={tenancyId} />
          <Field label={`Jumlah ${unit}`} htmlFor={`periods-${tenancyId}`} error={state.errors?.periods} required>
            <Select
              id={`periods-${tenancyId}`}
              name="periods"
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
            >
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {unit}
                </option>
              ))}
            </Select>
          </Field>

          <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <div className="flex items-center justify-between gap-3">
              <span>Estimasi total</span>
              <span className="text-lg font-bold">{formatRupiah(price * periods)}</span>
            </div>
            <p className="mt-0.5 text-xs text-brand-800">
              {formatRupiah(price)} × {periods} {unit}
              {nextStart && end && (
                <>
                  {" "}
                  · periode {formatDate(nextStart)} – {formatDate(addPeriod(end, "harian", -1))}
                </>
              )}
            </p>
          </div>

          <SubmitButton pendingText="Membuat tagihan…" className="w-full sm:w-auto">
            <CalendarPlus className="size-4" />
            Buat tagihan perpanjangan
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
