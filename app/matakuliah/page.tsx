"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function MataKuliahPage() {
  const BASE_URL = "http://127.0.0.1:8000/matakuliah";

  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    kode_mk: "",
    nama_mk: "",
    sks: "",
    semester: "",
  });

  const getToken = () => localStorage.getItem("token");

  const fetchMataKuliah = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Gagal mengambil data mata kuliah");
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
    fetchMataKuliah();
  }, []);

  const openTambahModal = () => {
    setIsEdit(false);
    setShowModal(true);
    setForm({
      kode_mk: "",
      nama_mk: "",
      sks: "",
      semester: "",
    });
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    setShowModal(true);
    setForm({
      kode_mk: item.kode_mk || "",
      nama_mk: item.nama_mk || "",
      sks: item.sks || "",
      semester: item.semester || "",
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEdit(false);
    setForm({
      kode_mk: "",
      nama_mk: "",
      sks: "",
      semester: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.kode_mk || !form.nama_mk || !form.sks || !form.semester) {
      Swal.fire({
        icon: "warning",
        title: "Data belum lengkap",
        text: "Semua field wajib diisi",
      });
      return;
    }

    if (Number(form.sks) < 1) {
      Swal.fire({
        icon: "warning",
        title: "SKS tidak valid",
        text: "SKS tidak boleh kurang dari 1",
      });
      return;
    }

    if (Number(form.semester) < 1) {
      Swal.fire({
        icon: "warning",
        title: "Semester tidak valid",
        text: "Semester tidak boleh kurang dari 1",
      });
      return;
    }

    try {
      const url = isEdit ? `${BASE_URL}/${form.kode_mk}` : `${BASE_URL}/`;

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          kode_mk: form.kode_mk,
          nama_mk: form.nama_mk,
          sks: Number(form.sks),
          semester: Number(form.semester),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Gagal menyimpan data");
      }

      closeModal();
      fetchMataKuliah();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.message || "Data berhasil disimpan",
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

  const handleDelete = async (kode_mk) => {
    const confirmDelete = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Data mata kuliah akan dihapus permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/${kode_mk}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Gagal menghapus data");
      }

      fetchMataKuliah();

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: result.message || "Data berhasil dihapus",
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
    item.nama_mk?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Mata Kuliah"
          subtitle="Kelola data mata kuliah perkuliahan"
        />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-sm text-cyan-400">Sistem Akademik</p>
                <h1 className="mt-2 text-2xl font-bold">
                  Manajemen Mata Kuliah
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Tambah, ubah, dan kelola data mata kuliah.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                  <p className="text-xl font-bold">{data.length}</p>
                  <span className="text-xs text-slate-300">Total Matkul</span>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                  <p className="text-xl font-bold">
                    {data.reduce(
                      (total, item) => total + Number(item.sks || 0),
                      0
                    )}
                  </p>
                  <span className="text-xs text-slate-300">Total SKS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Mata Kuliah
              </h2>

              <div className="flex gap-3 text-black">
                <input
                  type="text"
                  placeholder="Cari mata kuliah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
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
                    <th className="py-3">Kode</th>
                    <th>Nama Mata Kuliah</th>
                    <th>SKS</th>
                    <th>Semester</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Loading data...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((item) => (
                      <tr
                        key={item.kode_mk}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 font-medium text-slate-800">
                          {item.kode_mk}
                        </td>
                        <td className="text-slate-700">{item.nama_mk}</td>
                        <td className="text-slate-700">{item.sks}</td>
                        <td className="text-slate-700">{item.semester}</td>

                        <td className="flex gap-2 py-3">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg bg-yellow-100 px-3 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.kode_mk)}
                            className="rounded-lg bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
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
                    {isEdit ? "Edit Mata Kuliah" : "Tambah Mata Kuliah"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isEdit
                      ? "Ubah data mata kuliah yang dipilih"
                      : "Masukkan data mata kuliah baru"}
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
                  placeholder="Kode Mata Kuliah"
                  value={form.kode_mk}
                  disabled={isEdit}
                  onChange={(e) =>
                    setForm({ ...form, kode_mk: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none disabled:bg-slate-100"
                />

                <input
                  type="text"
                  placeholder="Nama Mata Kuliah"
                  value={form.nama_mk}
                  onChange={(e) =>
                    setForm({ ...form, nama_mk: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <input
                  type="number"
                  min="1"
                  placeholder="SKS"
                  value={form.sks}
                  onChange={(e) =>
                    setForm({ ...form, sks: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none"
                />

                <input
                  type="number"
                  min="1"
                  placeholder="Semester"
                  value={form.semester}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value })
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