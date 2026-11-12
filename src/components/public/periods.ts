import type { RentPeriod, Settings } from "@/lib/types";

type PriceSettings = Pick<Settings, "price_daily" | "price_weekly" | "price_monthly">;

export const PERIODS: RentPeriod[] = ["harian", "mingguan", "bulanan"];

export const MAX_DURATION: Record<RentPeriod, number> = {
  harian: 30,
  mingguan: 12,
  bulanan: 12,
};

export const PERIOD_DESCRIPTION: Record<RentPeriod, string> = {
  harian: "Cocok untuk menginap singkat atau urusan kerja.",
  mingguan: "Lebih hemat untuk tinggal beberapa minggu.",
  bulanan: "Paling hemat untuk tinggal jangka panjang.",
};

export function periodPrice(settings: PriceSettings, period: RentPeriod) {
  if (period === "harian") return settings.price_daily;
  if (period === "mingguan") return settings.price_weekly;
  return settings.price_monthly;
}

/** Periode sewa yang tersedia (harga > 0) beserta harganya. */
export function periodOptions(settings: PriceSettings) {
  return PERIODS.map((period) => ({ period, price: periodPrice(settings, period) })).filter((p) => p.price > 0);
}

/** Harga "mulai dari" untuk ditampilkan; utamakan harga bulanan. */
export function startingPrice(settings: PriceSettings) {
  const options = periodOptions(settings);
  return options.find((o) => o.period === "bulanan") ?? options[0] ?? null;
}

/** Batas maksimal tanggal mulai booking (bulan dari hari ini). */
export const MAX_ADVANCE_MONTHS = 6;
