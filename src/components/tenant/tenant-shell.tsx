"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ExternalLink, Home, KeyRound, Megaphone, Menu, Receipt, UserRound, Wrench, X } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/penghuni", label: "Dashboard", short: "Beranda", icon: Home },
  { href: "/penghuni/tagihan", label: "Tagihan", short: "Tagihan", icon: Receipt },
  { href: "/penghuni/keluhan", label: "Keluhan", short: "Keluhan", icon: Wrench },
  { href: "/penghuni/pengumuman", label: "Pengumuman", short: "Info", icon: Megaphone },
  { href: "/penghuni/profil", label: "Profil", short: "Profil", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/penghuni" ? pathname === "/penghuni" : pathname === href || pathname.startsWith(`${href}/`);
}

function ExtraLinks({ footer, onNavigate }: { footer: ReactNode; onNavigate?: () => void }) {
  const linkClass = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100";
  return (
    <div className="space-y-1">
      <Link href="/akun/password" onClick={onNavigate} className={linkClass}>
        <KeyRound className="size-4" /> Ubah password
      </Link>
      <Link href="/" target="_blank" onClick={onNavigate} className={linkClass}>
        <ExternalLink className="size-4" /> Lihat website
      </Link>
      {footer}
    </div>
  );
}

export function TenantShell({
  kosName,
  tenantName,
  footer,
  children,
}: {
  kosName: string;
  tenantName: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Sidebar desktop */}
      <aside className="no-print hidden w-64 shrink-0 border-r border-stone-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Portal Penghuni</p>
          <p className="truncate text-lg font-bold text-stone-900">{kosName}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active ? "bg-brand-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 px-3 py-3">
          <p className="truncate px-3 pb-1 text-xs text-stone-500">Masuk sebagai {tenantName}</p>
          <ExtraLinks footer={footer} />
        </div>
      </aside>

      {/* Top bar mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="truncate font-bold text-stone-900">{kosName}</p>
          <p className="truncate text-xs text-stone-500">Halo, {tenantName}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-3 top-16 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl">
            <p className="truncate px-3 pb-2 text-xs text-stone-500">Masuk sebagai {tenantName}</p>
            <ExtraLinks footer={footer} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition",
                    active ? "text-brand-700" : "text-stone-500 hover:text-stone-800",
                  )}
                >
                  <span className={cn("rounded-full px-3 py-1", active && "bg-brand-50")}>
                    <Icon className="size-5" />
                  </span>
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
