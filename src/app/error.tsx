"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-red-50 p-4 text-red-600">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-sm text-stone-500">Maaf, ada gangguan saat memuat halaman. Silakan coba lagi beberapa saat lagi.</p>
      <Button className="mt-6" onClick={() => retry()}>
        Coba lagi
      </Button>
    </main>
  );
}
