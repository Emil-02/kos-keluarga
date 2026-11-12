"use client";

import { Send } from "lucide-react";
import { submitPaymentAction } from "@/actions/tenant";
import { ActionForm } from "@/components/ui/action-form";
import { FileInput } from "@/components/ui/file-input";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function PaymentForm({ invoiceId, today, hasQris }: { invoiceId: string; today: string; hasQris: boolean }) {
  return (
    <ActionForm action={submitPaymentAction} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="invoice_id" value={invoiceId} />

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-stone-700">
              Metode pembayaran<span className="ml-0.5 text-red-500">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: "transfer", label: "Transfer bank" },
                ...(hasQris ? [{ value: "qris", label: "QRIS" }] : []),
              ].map((opt, i) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-800"
                >
                  <input type="radio" name="method" value={opt.value} defaultChecked={i === 0} className="accent-brand-600" />
                  {opt.label}
                </label>
              ))}
            </div>
            {state.errors?.method && <p className="mt-1 text-xs font-medium text-red-600">{state.errors.method[0]}</p>}
          </fieldset>

          <Field label="Tanggal bayar" htmlFor="paid_on" error={state.errors?.paid_on} required>
            <Input id="paid_on" name="paid_on" type="date" defaultValue={today} max={today} required />
          </Field>

          <Field
            label="Bukti pembayaran"
            htmlFor="proof"
            error={state.errors?.proof}
            hint="Foto atau tangkapan layar bukti transfer/QRIS (JPG, PNG, WEBP)."
            required
          >
            <FileInput id="proof" name="proof" required />
          </Field>

          <Field label="Catatan (opsional)" htmlFor="note" error={state.errors?.note}>
            <Textarea id="note" name="note" rows={2} maxLength={500} placeholder="Mis. transfer dari rekening a.n. ..." />
          </Field>

          <SubmitButton pendingText="Mengirim…" className="w-full sm:w-auto">
            <Send className="size-4" />
            Kirim bukti pembayaran
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
