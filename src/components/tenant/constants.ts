import type { RentPeriod } from "@/lib/types";

/** Batas jumlah periode untuk perpanjangan / bayar di muka oleh penghuni. */
export const MAX_EXTEND_PERIODS: Record<RentPeriod, number> = {
  harian: 30,
  mingguan: 12,
  bulanan: 12,
};
