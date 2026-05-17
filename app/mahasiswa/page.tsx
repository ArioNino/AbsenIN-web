"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function MahasiswaPage() {
  const BASE_URL = "http://127.0.0.1:8000/mahasiswa";

  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    id_mahasiswa: "",
    nim: "",
    nama: "",
    prodi: "",
  });

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchMahasiswa = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/`, {
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
        throw new Error(result.detail || "Gagal mengambil data mahasiswa");
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
    fetchMahasiswa();
  }, [router]);

  const openTambahModal = () => {
    setIsEdit(false);
    setShowModal(true);
    setForm({
      id_mahasiswa: "",
      nim: "",
      nama: "",
      kelas: "",
      prodi: "",
    });
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    setShowModal(true);
    setForm({
      id_mahasiswa: item.id_mahasiswa || "",
      nim: item.nim || "",
      nama: item.nama || "",
      kelas: item.kelas || "",
      prodi: item.prodi || "",
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEdit(false);
    setForm({
      id_mahasiswa: "",
      nim: "",
      nama: "",
      kelas: "",
      prodi: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nim || !form.nama || !form.prodi) {
      Swal.fire({
        icon: "warning",
        title: "Data belum lengkap",
        text: "Semua field wajib diisi",
      });
      return;
    }

    try {
      const url = isEdit
        ? `${BASE_URL}/${form.id_mahasiswa}`
        : `${BASE_URL}/`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          nim: form.nim,
          nama: form.nama,
          prodi: form.prodi,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(result.detail || "Gagal menyimpan data mahasiswa");
      }

      closeModal();
      fetchMahasiswa();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.message || "Data mahasiswa berhasil disimpan",
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

  const handleDelete = async (id_mahasiswa) => {
    const confirmDelete = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Data mahasiswa akan dihapus permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/${id_mahasiswa}`, {
        method: "DELETE",
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
        throw new Error(result.detail || "Gagal menghapus data mahasiswa");
      }

      fetchMahasiswa();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.message || "Data mahasiswa berhasil dihapus",
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
    item.nama?.toLowerCase().includes(search.toLowerCase())
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
        <Topbar title="Mahasiswa" subtitle="Kelola data mahasiswa" />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">Data Mahasiswa</h1>
            <p className="text-sm text-slate-300 mt-2">
              Daftar mahasiswa terdaftar
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Mahasiswa
              </h2>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Cari mahasiswa..."
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
                    <th className="py-3">NIM</th>
                    <th>Nama</th>
                    <th>Kelas</th>
                    <th>Prodi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-6 text-slate-400"
                      >
                        Loading data...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((item) => (
                      <tr
                        key={item.id_mahasiswa}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 font-medium text-slate-800">
                          {item.nim}
                        </td>
                        <td className="text-slate-700">{item.nama}</td>
                        <td className="text-slate-700">{item.nama_kelas ?? "-"}</td>
                        <td className="text-slate-700">{item.prodi}</td>

                        <td className="flex gap-2 py-3">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg bg-yellow-100 px-3 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(item.id_mahasiswa)
                            }
                            className="rounded-lg bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-6 text-slate-400"
                      >
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
                    {isEdit ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEdit
                      ? "Ubah data mahasiswa yang dipilih"
                      : "Masukkan data mahasiswa baru"}
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
                  placeholder="NIM"
                  value={form.nim}
                  onChange={(e) =>
                    setForm({ ...form, nim: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <input
                  type="text"
                  placeholder="Nama Mahasiswa"
                  value={form.nama}
                  onChange={(e) =>
                    setForm({ ...form, nama: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <input
                  type="text"
                  placeholder="Kelas"
                  value={form.kelas}
                  onChange={(e) =>
                    setForm({ ...form, kelas: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <input
                  type="text"
                  placeholder="Program Studi"
                  value={form.prodi}
                  onChange={(e) =>
                    setForm({ ...form, prodi: e.target.value })
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