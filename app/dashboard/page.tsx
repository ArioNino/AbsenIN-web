import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MetricCard from "@/components/MetricCard";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-[#F0F4FF]">
      <Sidebar />

      <main className="ml-60 flex-1 flex flex-col">
        <Topbar />

        <section className="p-8 space-y-6">
          {/* HERO */}
          <div className="bg-[#1C2333] text-white p-6 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-green-400 text-sm">● Kamera Aktif</span>

              <h3 className="font-syne text-xl font-bold mt-2">
                Face Recognition Aktif
              </h3>

              <p className="text-white/60 text-sm mt-1">Akurasi 98.7%</p>

              <div className="flex gap-3 mt-4">
                <button className="bg-cyan-400 text-black px-4 py-2 rounded">
                  Mulai
                </button>
                <button className="border border-white/20 px-4 py-2 rounded">
                  Lihat Kamera
                </button>
              </div>
            </div>

            <div className="w-32 h-32 border-2 border-cyan-400 rounded-lg flex items-center justify-center">
              👤
            </div>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Hadir" value="847" />
            <MetricCard title="Sesi" value="24" />
            <MetricCard title="Terlambat" value="63" />
            <MetricCard title="Kehadiran" value="92%" />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b flex justify-between">
              <h3 className="font-syne font-bold text-sm text-gray-800">
                Log Presensi
              </h3>
              <span className="text-cyan-500 text-sm cursor-pointer">
                Lihat Semua
              </span>
            </div>

            <table className="w-full text-sm">
              <thead className="text-gray-400 text-xs">
                <tr>
                  <th className="p-3 text-left">Nama</th>
                  <th className="p-3 text-left">Mata Kuliah</th>
                  <th className="p-3 text-left">Waktu</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody className="text-gray-700">
                <tr className="border-t hover:bg-gray-50">
                  <td className="p-3">Rizky</td>
                  <td className="p-3">AI</td>
                  <td className="p-3">07:48</td>
                  <td className="p-3 text-green-500 font-medium">Hadir</td>
                </tr>

                <tr className="border-t hover:bg-gray-50">
                  <td className="p-3">Fahmi</td>
                  <td className="p-3">AI</td>
                  <td className="p-3">08:15</td>
                  <td className="p-3 text-yellow-500 font-medium">Terlambat</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
