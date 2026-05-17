"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

type BAP = {
  id: number;
  id_kelas?: number;
  id_mata_kuliah?: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  pertemuan_ke: number;
  materi: string;
  catatan?: string;
  mata_kuliah?: {
    kode_mk?: string;
    nama_mk?: string;
  };
  kelas?: {
    id?: number;
    nama_kelas?: string;
  };
};

export default function RiwayatBAPPage() {
  const router = useRouter();

  const BAP_URL = "http://127.0.0.1:8000/berita-acara";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [bapList, setBapList] = useState<BAP[]>([]);
  const [search, setSearch] = useState("");

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    localStorage.removeItem("active_bap");
    router.push("/login");
  };

  const fetchBAP = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${BAP_URL}/`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal mengambil data BAP");
      }

      setBapList(result);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setCheckingAuth(false);
    fetchBAP();
  }, [router]);

  const filteredBAP = bapList.filter((item) => {
    const namaMk =
      item.mata_kuliah?.nama_mk ||
      item.id_mata_kuliah ||
      "";

    const kelas =
      item.kelas?.nama_kelas ||
      "";

    const keyword = search.toLowerCase();

    return (
      namaMk.toLowerCase().includes(keyword) ||
      kelas.toLowerCase().includes(keyword) ||
      String(item.pertemuan_ke).includes(keyword) ||
      item.tanggal?.toLowerCase().includes(keyword)
    );
  });

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Mengecek login...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Riwayat BAP"
          subtitle="Lihat daftar berita acara perkuliahan dan kelola absensi manual"
        />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <h1 className="text-2xl font-bold">
                  Riwayat Berita Acara Perkuliahan
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Pilih salah satu BAP untuk melihat dan mengedit absensi mahasiswa secara manual.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {bapList.length}
                  </p>
                  <span className="text-xs text-slate-300">Total BAP</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {filteredBAP.length}
                  </p>
                  <span className="text-xs text-slate-300">Ditampilkan</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar BAP
              </h2>

              <input
                type="text"
                placeholder="Cari mata kuliah, kelas, pertemuan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400 md:w-80"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">Mata Kuliah</th>
                    <th>Kelas</th>
                    <th>Pertemuan</th>
                    <th>Tanggal</th>
                    <th>Waktu</th>
                    <th>Materi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-slate-500"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : filteredBAP.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-slate-500"
                      >
                        Data BAP tidak ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredBAP.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4">
                          <p className="font-medium text-slate-800">
                            {item.mata_kuliah?.nama_mk ||
                              item.id_mata_kuliah ||
                              "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.mata_kuliah?.kode_mk ||
                              item.id_mata_kuliah ||
                              "-"}
                          </p>
                        </td>

                        <td className="text-slate-700">
                          {item.kelas?.nama_kelas || "-"}
                        </td>

                        <td>
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
                            Ke-{item.pertemuan_ke}
                          </span>
                        </td>

                        <td className="text-slate-700">
                          {item.tanggal || "-"}
                        </td>

                        <td className="text-slate-700">
                          {item.waktu_mulai} - {item.waktu_selesai}
                        </td>

                        <td className="max-w-[260px] truncate text-slate-700">
                          {item.materi || "-"}
                        </td>

                        <td>
                          <button
                            onClick={() =>
                              router.push(`/riwayat/${item.id}`)
                            }
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Lihat Absensi
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}