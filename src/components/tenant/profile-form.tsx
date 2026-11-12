"use client";

import { Save } from "lucide-react";
import { updateProfileAction } from "@/actions/tenant";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Props = {
  email: string | null;
  fullName: string;
  phone: string | null;
  address: string | null;
};

export function ProfileForm({ email, fullName, phone, address }: Props) {
  return (
    <ActionForm action={updateProfileAction} className="space-y-4">
      {(state) => (
        <>
          <Field label="Email" htmlFor="email" hint="Email dipakai untuk login dan tidak dapat diubah sendiri. Hubungi pengelola jika perlu diganti.">
            <Input id="email" type="email" value={email ?? "-"} readOnly disabled />
          </Field>
          <Field label="Nama lengkap" htmlFor="full_name" error={state.errors?.full_name} required>
            <Input id="full_name" name="full_name" defaultValue={fullName} maxLength={100} required autoComplete="name" />
          </Field>
          <Field label="Nomor HP / WhatsApp" htmlFor="phone" error={state.errors?.phone} hint="Dipakai untuk pengingat tagihan via WhatsApp.">
            <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="08xxxxxxxxxx" autoComplete="tel" />
          </Field>
          <Field label="Alamat asal" htmlFor="address" error={state.errors?.address}>
            <Textarea id="address" name="address" rows={3} maxLength={300} defaultValue={address ?? ""} />
          </Field>
          <SubmitButton pendingText="Menyimpan…">
            <Save className="size-4" />
            Simpan profil
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
