"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function BAPPage() {
  const router = useRouter();

  const BAP_URL = "http://127.0.0.1:8000/berita-acara";
  const MATKUL_URL = "http://127.0.0.1:8000/matakuliah";
  const KELAS_URL = "http://127.0.0.1:8000/kelas";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mataKuliah, setMataKuliah] = useState([]);
  const [kelas, setKelas] = useState([]);

  const [form, setForm] = useState({
    id_kelas: "",
    id_mata_kuliah: "",
    waktu_mulai: "",
    waktu_selesai: "",
    tanggal: "",
    pertemuan_ke: "",
    materi: "",
    catatan: "",
  });

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchMataKuliah = async () => {
    try {
      const response = await fetch(`${MATKUL_URL}/`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal mengambil data mata kuliah");
      }

      setMataKuliah(result);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    }
  };

  const fetchKelas = async () => {
    try {
      const response = await fetch(`${KELAS_URL}/`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal mengambil data kelas");
      }

      setKelas(result);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    setCheckingAuth(false);
    fetchMataKuliah();
    fetchKelas();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.id_kelas ||
      !form.id_mata_kuliah ||
      !form.waktu_mulai ||
      !form.waktu_selesai ||
      !form.tanggal ||
      !form.pertemuan_ke ||
      !form.materi
    ) {
      Swal.fire({
        icon: "warning",
        title: "Data belum lengkap",
        text: "Kelas, mata kuliah, waktu, tanggal, pertemuan, dan materi wajib diisi",
      });
      return;
    }

    if (Number(form.pertemuan_ke) < 1) {
      Swal.fire({
        icon: "warning",
        title: "Pertemuan tidak valid",
        text: "Pertemuan ke- tidak boleh kurang dari 1",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BAP_URL}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          id_kelas: Number(form.id_kelas),
          id_mata_kuliah: form.id_mata_kuliah,
          waktu_mulai: form.waktu_mulai,
          waktu_selesai: form.waktu_selesai,
          pertemuan_ke: Number(form.pertemuan_ke),
          tanggal: form.tanggal,
          materi: form.materi,
          catatan: form.catatan,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal menyimpan BAP");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Berita acara berhasil disimpan",
        timer: 1500,
        showConfirmButton: false,
      });

      setForm({
        id_kelas: "",
        id_mata_kuliah: "",
        waktu_mulai: "",
        waktu_selesai: "",
        tanggal: "",
        pertemuan_ke: "",
        materi: "",
        catatan: "",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      id_kelas: "",
      id_mata_kuliah: "",
      waktu_mulai: "",
      waktu_selesai: "",
      tanggal: "",
      pertemuan_ke: "",
      materi: "",
      catatan: "",
    });
  };

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
          title="BAP Perkuliahan"
          subtitle="Isi berita acara perkuliahan"
        />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">Berita Acara Perkuliahan</h1>
            <p className="text-sm text-slate-300 mt-2">
              Isi laporan kegiatan perkuliahan
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={form.id_kelas}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, id_kelas: e.target.value })
                }
              >
                <option value="">Pilih Kelas</option>
                {kelas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama_kelas || item.nama || item.kelas}
                  </option>
                ))}
              </select>

              <select
                value={form.id_mata_kuliah}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, id_mata_kuliah: e.target.value })
                }
              >
                <option value="">Pilih Mata Kuliah</option>
                {mataKuliah.map((item) => (
                  <option key={item.kode_mk} value={item.kode_mk}>
                    {item.kode_mk} - {item.nama_mk}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <input
                type="date"
                value={form.tanggal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, tanggal: e.target.value })
                }
              />

              <input
                type="time"
                value={form.waktu_mulai}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, waktu_mulai: e.target.value })
                }
              />

              <input
                type="time"
                value={form.waktu_selesai}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, waktu_selesai: e.target.value })
                }
              />

              <input
                type="number"
                min="1"
                placeholder="Pertemuan ke-"
                value={form.pertemuan_ke}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, pertemuan_ke: e.target.value })
                }
              />
            </div>

            <textarea
              placeholder="Materi yang diajarkan..."
              rows={4}
              value={form.materi}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(e) => setForm({ ...form, materi: e.target.value })}
            />

            <textarea
              placeholder="Catatan tambahan..."
              rows={3}
              value={form.catatan}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Simpan BAP"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}