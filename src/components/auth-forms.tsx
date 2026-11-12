"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction, loginAction, updatePasswordAction } from "@/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email" htmlFor="email" error={state.errors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" error={state.errors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <div className="flex justify-end">
            <Link href="/lupa-password" className="text-sm font-medium text-brand-700 hover:underline">
              Lupa password?
            </Link>
          </div>
          <SubmitButton className="w-full" pendingText="Masuk…">
            Masuk
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4">
      {(state) => (
        <>
          <Field label="Email" htmlFor="email" error={state.errors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full" pendingText="Mengirim…">
            Kirim tautan reset
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function UpdatePasswordForm() {
  return (
    <ActionForm action={updatePasswordAction} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <Field label="Password baru" htmlFor="password" error={state.errors?.password} hint="Minimal 8 karakter">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Ulangi password baru" htmlFor="confirm" error={state.errors?.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton pendingText="Menyimpan…">Simpan password</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
