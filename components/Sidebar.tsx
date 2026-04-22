export default function Sidebar() {
  return (
    <aside className="w-60 bg-[#0D1117] text-white fixed h-full flex flex-col">

      {/* LOGO */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-green-400 rounded-lg flex items-center justify-center">
            👤
          </div>
          <div>
            <h1 className="font-syne font-bold text-sm">FaceAttend</h1>
            <p className="text-[10px] text-white/40 uppercase">
              Presensi Pintar
            </p>
          </div>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-3 py-4 text-sm space-y-1">

        <p className="text-white/30 text-xs px-3 mt-2 uppercase">Utama</p>

        <a className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-400">
          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
          Dashboard
        </a>

        <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/60">
          <span className="w-2 h-2 bg-white/20 rounded-full"></span>
          Presensi Realtime
          <span className="ml-auto text-xs bg-red-500 px-2 rounded-full">3</span>
        </a>

        <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white/60">
          <span className="w-2 h-2 bg-white/20 rounded-full"></span>
          Riwayat Kehadiran
        </a>

        <p className="text-white/30 text-xs px-3 mt-4 uppercase">Akademik</p>

        <a className="block px-3 py-2 rounded-lg hover:bg-white/10 text-white/60">
          Mata Kuliah
        </a>
        <a className="block px-3 py-2 rounded-lg hover:bg-white/10 text-white/60">
          Jadwal
        </a>
        <a className="block px-3 py-2 rounded-lg hover:bg-white/10 text-white/60">
          Mahasiswa
        </a>

      </nav>

      {/* USER */}
      <div className="px-5 py-4 border-t border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
          AD
        </div>
        <div>
          <p className="text-sm">Admin Kampus</p>
          <p className="text-xs text-white/40">Administrator</p>
        </div>
      </div>

    </aside>
  );
}