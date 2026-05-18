"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Calendar, Plus } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  /**
   * Aksi opsional di kanan topbar (mis. tombol "Sesi Baru" atau filter).
   * Kalau tidak diisi, tombol "Sesi Baru" default akan ditampilkan
   * untuk halaman dashboard / overview.
   */
  actions?: ReactNode;
};

export default function Topbar({ title, subtitle, actions }: Props) {
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("id-ID", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-6 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="min-w-0">
        <h2 className="font-syne truncate text-base font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {today || "—"}
        </span>

        {actions ?? (
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800">
            <Plus className="h-3.5 w-3.5" />
            Sesi Baru
          </button>
        )}
      </div>
    </header>
  );
}
