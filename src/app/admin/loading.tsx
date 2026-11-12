import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-stone-400">
      <Loader2 className="size-6 animate-spin" aria-label="Memuat" />
    </div>
  );
}
