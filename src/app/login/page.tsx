import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const current = await getCurrentUser();
  if (current) redirect(current.profile.role === "admin" ? "/admin" : "/penghuni");

  return (
    <AuthShell title="Masuk ke akun Anda" description="Portal penghuni & panel pengelola kos.">
      {error === "link" && (
        <Alert tone="error" className="mb-4">
          Tautan tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.
        </Alert>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-stone-500">
        Belum menjadi penghuni?{" "}
        <Link href="/booking" className="font-semibold text-brand-700 hover:underline">
          Booking kamar
        </Link>
      </p>
    </AuthShell>
  );
}
