"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  ExternalLink,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Menu,
  Receipt,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/booking", label: "Booking", icon: CalendarCheck, badgeKey: "bookings" },
  { href: "/admin/penghuni", label: "Penghuni", icon: Users },
  { href: "/admin/tagihan", label: "Tagihan & Bayar", icon: Receipt, badgeKey: "payments" },
  { href: "/admin/kamar", label: "Kamar", icon: BedDouble },
  { href: "/admin/keluhan", label: "Keluhan", icon: Wrench, badgeKey: "complaints" },
  { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
  { href: "/admin/keuangan", label: "Keuangan", icon: BarChart3 },
  { href: "/admin/konten", label: "Konten Website", icon: Images },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

type Badges = { bookings: number; payments: number; complaints: number };

function NavLinks({ badges, onNavigate }: { badges: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const badge = "badgeKey" in item ? badges[item.badgeKey] : 0;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand-600 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  active ? "bg-white/20 text-white" : "bg-accent-500 text-white",
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  kosName,
  adminName,
  badges,
  footer,
  children,
}: {
  kosName: string;
  adminName: string;
  badges: Badges;
  footer: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Panel Pengelola</p>
        <p className="truncate text-lg font-bold text-stone-900">{kosName}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavLinks badges={badges} onNavigate={() => setOpen(false)} />
      </div>
      <div className="space-y-1 border-t border-stone-200 px-3 py-3">
        <p className="truncate px-3 pb-1 text-xs text-stone-500">Masuk sebagai {adminName}</p>
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
          <ExternalLink className="size-4" /> Lihat website
        </Link>
        <Link href="/akun/password" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
          <KeyRound className="size-4" /> Ubah password
        </Link>
        {footer}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="no-print hidden w-64 shrink-0 border-r border-stone-200 bg-white lg:sticky lg:top-0 lg:block lg:h-dvh">
        {sidebar}
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <p className="truncate font-bold text-stone-900">{kosName}</p>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" aria-label="Buka menu">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-stone-500 hover:bg-stone-100"
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
