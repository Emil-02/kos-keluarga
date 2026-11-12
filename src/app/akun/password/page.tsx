import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { UpdatePasswordForm } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Ubah Password", robots: { index: false } };

export default async function ChangePasswordPage() {
  const { profile } = await requireUser("/akun/password");
  const home = profile.role === "admin" ? "/admin" : "/penghuni";

  return (
    <AuthShell title="Ubah password" description={`Akun: ${profile.email ?? ""}`}>
      <UpdatePasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href={home} className="font-semibold text-brand-700 hover:underline">
          Kembali ke dashboard
        </Link>
      </p>
    </AuthShell>
  );
}
