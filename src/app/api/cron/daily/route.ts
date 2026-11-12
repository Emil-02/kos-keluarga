import { NextResponse, type NextRequest } from "next/server";
import { runDailyBilling } from "@/lib/billing";

export const maxDuration = 60;

/**
 * Dipanggil Vercel Cron setiap hari (lihat vercel.json).
 * Vercel mengirim header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyBilling();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] gagal", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
