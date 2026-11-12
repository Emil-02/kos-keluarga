import Link from "next/link";
import { House } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { DesktopNav, MobileMenu } from "@/components/public/nav-links";
import { CONTAINER } from "@/components/public/site";
import { cn } from "@/lib/cn";

export function Logo({ name, className, light }: { name: string; className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          light ? "bg-white/10 text-brand-200 ring-1 ring-white/15" : "bg-brand-600 text-white",
        )}
      >
        <House className="size-5" aria-hidden />
      </span>
      <span className={cn("truncate text-lg font-extrabold tracking-tight", light ? "text-white" : "text-stone-900")}>
        {name}
      </span>
    </Link>
  );
}

export function Navbar({ kosName }: { kosName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className={cn(CONTAINER, "relative flex h-16 items-center justify-between gap-4")}>
        <Logo name={kosName} />
        <DesktopNav />
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClass("ghost", "md")}>
            Masuk
          </Link>
          <Link href="/booking" className={buttonClass("accent", "md")}>
            Booking
          </Link>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
