"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function KelasPage() {
  const router = useRouter();
  const KELAS_URL = "http://127.0.0.1:8000/kelas";

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    id: "",
    nama_kelas: "",
  });

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchKelas = async () => {
    setLoading(true);

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

      setData(result);
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

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    setCheckingAuth(false);
    fetchKelas();
  }, [router]);

  const openTambahModal = () => {
    setIsEdit(false);
    setShowModal(true);
    setForm({
      id: "",
      nama_kelas: "",
    });
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    setShowModal(true);
    setForm({
      id: item.id || "",
      nama_kelas: item.nama_kelas || "",
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEdit(false);
    setForm({
      id: "",
      nama_kelas: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nama_kelas) {
      Swal.fire({
        icon: "warning",
        title: "Data belum lengkap",
        text: "Nama kelas wajib diisi",
      });
      return;
    }

    try {
      const url = isEdit ? `${KELAS_URL}/${form.id}` : `${KELAS_URL}/`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          nama_kelas: form.nama_kelas,
        }),
      });

      const result = response.status === 204 ? null : await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result?.detail || "Gagal menyimpan data kelas");
      }

      closeModal();
      fetchKelas();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Kelas berhasil diupdate" : "Kelas berhasil ditambahkan",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Data kelas akan dihapus permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const response = await fetch(`${KELAS_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = response.status === 204 ? null : await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result?.detail || "Gagal menghapus data kelas");
      }

      fetchKelas();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Kelas berhasil dihapus",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || "Terjadi kesalahan",
      });
    }
  };

  const filtered = data.filter((item) =>
    item.nama_kelas?.toLowerCase().includes(search.toLowerCase())
  );

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
        <Topbar title="Kelas" subtitle="Kelola data kelas perkuliahan" />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-sm text-cyan-400">Sistem Akademik</p>
                <h1 className="mt-2 text-2xl font-bold">Manajemen Kelas</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Tambah, ubah, dan kelola data kelas.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                <p className="text-xl font-bold">{data.length}</p>
                <span className="text-xs text-slate-300">Total Kelas</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Kelas
              </h2>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Cari kelas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
                />

                <button
                  onClick={openTambahModal}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  + Tambah
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">Nama Kelas</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-400">
                        Loading data...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 font-medium text-slate-800">
                          {item.nama_kelas}
                        </td>

                        <td className="flex gap-2 py-3">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg bg-yellow-100 px-3 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-400">
                        Data tidak ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {isEdit ? "Edit Kelas" : "Tambah Kelas"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEdit
                      ? "Ubah data kelas yang dipilih"
                      : "Masukkan data kelas baru"}
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nama Kelas"
                  value={form.nama_kelas}
                  onChange={(e) =>
                    setForm({ ...form, nama_kelas: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                  >
                    {isEdit ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}