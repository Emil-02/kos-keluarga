import { Alert } from "@/components/ui/card";
import { FlashClear } from "@/components/admin/flash-clear";
import { readFlash } from "@/lib/flash";

export async function FlashMessage() {
  const flash = await readFlash();
  if (!flash) return null;
  return (
    <>
      <Alert tone={flash.tone} className="mb-6 font-medium">
        {flash.message}
      </Alert>
      <FlashClear />
    </>
  );
}
