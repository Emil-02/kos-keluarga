"use client";

import { Send } from "lucide-react";
import { createComplaintAction } from "@/actions/tenant";
import { ActionForm } from "@/components/ui/action-form";
import { FileInput } from "@/components/ui/file-input";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function ComplaintForm() {
  return (
    <ActionForm action={createComplaintAction} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <Field label="Judul" htmlFor="title" error={state.errors?.title} required>
            <Input id="title" name="title" maxLength={120} placeholder="Mis. Keran kamar mandi bocor" required />
          </Field>
          <Field label="Deskripsi" htmlFor="description" error={state.errors?.description} required>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Ceritakan masalahnya, sejak kapan, dan lokasinya."
              required
            />
          </Field>
          <Field label="Foto (opsional)" htmlFor="photo" error={state.errors?.photo} hint="JPG, PNG, atau WEBP. Maks. 4 MB.">
            <FileInput id="photo" name="photo" />
          </Field>
          <SubmitButton pendingText="Mengirim…" className="w-full sm:w-auto">
            <Send className="size-4" />
            Kirim keluhan
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
