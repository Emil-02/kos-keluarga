import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-brand-50 p-4 text-brand-600">
        <SearchX className="size-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-stone-500">Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-6")}>
        Kembali ke beranda
      </Link>
    </main>
  );
}
