import { NextResponse } from "next/server";
import { clearFlash } from "@/lib/flash";

/** Dipanggil via fetch (bukan Server Action) agar halaman tidak dirender ulang. */
export async function DELETE() {
  await clearFlash();
  return new NextResponse(null, { status: 204 });
}
