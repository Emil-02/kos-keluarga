"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { NAV_LINKS } from "@/components/public/site";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="menu-mobile"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="inline-flex size-10 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full border-b border-stone-200 bg-white px-4 pt-2 pb-5 shadow-lg"
        >
          <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-base font-medium",
                    active ? "bg-brand-50 text-brand-700" : "text-stone-700 hover:bg-stone-100",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className={buttonClass("outline", "md")}>
              Masuk
            </Link>
            <Link href="/booking" onClick={() => setOpen(false)} className={buttonClass("accent", "md")}>
              Booking
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
