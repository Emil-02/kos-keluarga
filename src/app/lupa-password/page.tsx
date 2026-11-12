import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Lupa Password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Lupa password" description="Masukkan email akun Anda, kami akan mengirim tautan untuk membuat password baru.">
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </AuthShell>
  );
}
