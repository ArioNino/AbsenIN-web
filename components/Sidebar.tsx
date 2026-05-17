"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");

    router.push("/login");
  };

  const menuClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
      pathname === path
        ? "bg-cyan-500/10 text-cyan-400"
        : "text-white/60 hover:bg-white/10"
    }`;

  return (
    <aside className="w-60 bg-[#0D1117] text-white fixed h-full flex flex-col">
      {/* LOGO */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-green-400 rounded-lg flex items-center justify-center">
            👤
          </div>

          <div>
            <h1 className="font-syne font-bold text-sm">AbsenIN</h1>
            <p className="text-[10px] text-white/40 uppercase">
              Presensi Pintar
            </p>
          </div>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-3 py-4 text-sm space-y-1">
        <p className="text-white/30 text-xs px-3 mt-2 uppercase">Utama</p>

        <Link href="/dashboard" className={menuClass("/dashboard")}>
          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
          Dashboard
        </Link>

        <Link href="/presensi" className={menuClass("/presensi")}>
          <span className="w-2 h-2 bg-white/20 rounded-full"></span>
          Presensi Realtime
          <span className="ml-auto text-xs bg-red-500 px-2 rounded-full">
            3
          </span>
        </Link>


        <Link href="/bap" className={menuClass("/bap")}>
          <span className="w-2 h-2 bg-white/20 rounded-full"></span>
          Berita Acara Perkuliahan
        </Link>

        <Link href="/riwayat" className={menuClass("/riwayat")}>
          <span className="w-2 h-2 bg-white/20 rounded-full"></span>
          Riwayat Kehadiran
        </Link>

        <p className="text-white/30 text-xs px-3 mt-4 uppercase">Akademik</p>

        <Link href="/matakuliah" className={menuClass("/matakuliah")}>
          Mata Kuliah
        </Link>

        {/* <Link href="/kelas" className={menuClass("/kelas")}>
          Kelas
        </Link> */}

        <Link href="/mahasiswa" className={menuClass("/mahasiswa")}>
          Mahasiswa
        </Link>
      </nav>

      {/* USER */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>

          <div>
            <p className="text-sm">{user?.name || "User"}</p>

            <p className="text-xs text-white/40">
              {user?.role || "Role"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-500 py-2 text-sm font-medium hover:bg-red-600 transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}