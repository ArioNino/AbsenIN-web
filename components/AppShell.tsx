"use client";

import { type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Layout shell konsisten untuk semua halaman authenticated.
 * Ngebungkus Sidebar + Topbar + main content area dengan padding/spacing seragam.
 */
export default function AppShell({
  title,
  subtitle,
  actions,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />

        <div className="flex-1 space-y-6 p-6">{children}</div>
      </main>
    </div>
  );
}
