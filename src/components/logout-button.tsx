import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/cn";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-red-50 hover:text-red-700",
          className,
        )}
      >
        <LogOut className="size-4" />
        Keluar
      </button>
    </form>
  );
}
