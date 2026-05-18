"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  ScanFace,
  type LucideIcon,
} from "lucide-react";

type StoredUser = {
  name?: string;
  role?: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/presensi", label: "Presensi Realtime", icon: ScanFace },
  { href: "/bap", label: "Berita Acara", icon: ClipboardList },
  { href: "/riwayat", label: "Riwayat Kehadiran", icon: History },
];

const ACADEMIC_NAV: NavItem[] = [
  { href: "/matakuliah", label: "Mata Kuliah", icon: BookOpen },
  { href: "/mahasiswa", label: "Mahasiswa", icon: GraduationCap },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as StoredUser);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
          active
            ? "bg-cyan-500/10 text-cyan-300"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400" />
        )}

        <Icon
          className={`h-4 w-4 shrink-0 ${
            active ? "text-cyan-300" : "text-white/40 group-hover:text-white/70"
          }`}
        />
        <span className="truncate">{item.label}</span>

        {item.badge && (
          <span className="ml-auto rounded-full bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-[#0D1117] text-white shadow-[4px_0_24px_rgba(15,23,42,0.06)]">
      {/* LOGO */}
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-900 shadow-[0_4px_16px_rgba(34,211,238,0.45)]">
          <ScanFace className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1 className="font-syne text-sm font-bold leading-tight">
            AbsenIN
          </h1>
          <p className="text-[10px] uppercase tracking-wider text-white/40">
            Presensi Pintar
          </p>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
          Utama
        </p>
        <div className="space-y-0.5">{PRIMARY_NAV.map(renderItem)}</div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-medium uppercase tracking-wider text-white/30">
          Akademik
        </p>
        <div className="space-y-0.5">{ACADEMIC_NAV.map(renderItem)}</div>
      </nav>

      {/* USER */}
      <div className="border-t border-white/5 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.name || "User"}
            </p>
            <p className="truncate text-[11px] text-white/40">
              {user?.role || "Role"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
