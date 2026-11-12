import { RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { runBillingNowAction } from "@/actions/admin/tenancies";

export function RunBillingButton() {
  return (
    <ActionForm action={runBillingNowAction} className="flex max-w-md flex-col items-end text-right">
      <SubmitButton
        variant="outline"
        size="sm"
        pendingText="Memproses…"
        confirm="Buat tagihan periode berikutnya dan kirim pengingat sekarang?"
      >
        <RefreshCw className="size-4" /> Jalankan penagihan sekarang
      </SubmitButton>
    </ActionForm>
  );
}
