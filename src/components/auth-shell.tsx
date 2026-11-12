import Link from "next/link";
import type { ReactNode } from "react";
import { Home } from "lucide-react";
import { getSettings } from "@/lib/data/public";

export async function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const settings = await getSettings();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-50 via-stone-50 to-amber-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-bold text-brand-800">
          <span className="rounded-xl bg-brand-600 p-2 text-white">
            <Home className="size-5" />
          </span>
          {settings.kos_name}
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-stone-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
