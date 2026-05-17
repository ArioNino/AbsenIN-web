"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

type RekapItem = {
  id_kehadiran: number | null;
  id_mahasiswa: number;
  nim: string;
  nama: string;
  prodi: string;
  status: string;
  keterangan: string | null;
};

const STATUS_OPTIONS = ["Hadir", "Terlambat", "Izin", "Sakit", "Alpha"];

export default function DetailRiwayatBAPPage() {
  const router = useRouter();
  const params = useParams();
  const bapId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rekap, setRekap] = useState<RekapItem[]>([]);

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    localStorage.removeItem("active_bap");
    router.push("/login");
  };

  const fetchRekap = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `http://127.0.0.1:8000/kehadiran/bap/${bapId}/rekap`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal mengambil rekap kehadiran");
      }

      setRekap(result);
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

    fetchRekap();
  }, [bapId]);

  const handleChangeStatus = (index: number, value: string) => {
    const updated = [...rekap];

    updated[index] = {
      ...updated[index],
      status: value,
    };

    setRekap(updated);
  };

  const saveItem = async (item: RekapItem) => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    let response;

    if (item.id_kehadiran) {
      response = await fetch(
        `http://127.0.0.1:8000/kehadiran/${item.id_kehadiran}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: item.status,
          }),
        }
      );
    } else {
      response = await fetch("http://127.0.0.1:8000/kehadiran/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_bap: Number(bapId),
          id_mahasiswa: item.id_mahasiswa,
          status: item.status,
        }),
      });
    }

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(result.detail || "Gagal menyimpan kehadiran");
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      for (const item of rekap) {
        await saveItem(item);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Seluruh data kehadiran berhasil disimpan",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchRekap();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan saat menyimpan data",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSelectClass = (status: string) => {
    if (status === "Hadir") return "border-green-200 text-green-700";
    if (status === "Terlambat") return "border-yellow-200 text-yellow-700";
    if (status === "Izin") return "border-blue-200 text-blue-700";
    if (status === "Sakit") return "border-purple-200 text-purple-700";
    return "border-red-200 text-red-700";
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Detail Absensi BAP"
          subtitle="Edit status kehadiran mahasiswa secara manual"
        />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Rekap Kehadiran</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Mahasiswa yang belum absen otomatis tampil sebagai Alpha.
                </p>
              </div>

              <button
                onClick={() => router.push("/riwayat-bap")}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Kembali
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Mahasiswa
              </h2>

              <div className="text-sm text-slate-500">
                Total: {rekap.length} mahasiswa
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">Nama</th>
                    <th>NIM</th>
                    <th>Prodi</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-slate-500"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : rekap.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-slate-500"
                      >
                        Data mahasiswa tidak ditemukan
                      </td>
                    </tr>
                  ) : (
                    rekap.map((item, index) => (
                      <tr
                        key={item.id_mahasiswa}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 font-medium text-slate-800">
                          {item.nama}
                        </td>

                        <td className="text-slate-700">{item.nim}</td>

                        <td className="text-slate-700">{item.prodi}</td>

                        <td>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleChangeStatus(index, e.target.value)
                            }
                            className={`rounded-full border bg-white px-4 py-2 text-xs font-medium outline-none transition focus:ring-2 focus:ring-cyan-400 ${getSelectClass(
                              item.status
                            )}`}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAll}
                  disabled={saving || loading}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Semua"}
                </button>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}