"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useState } from "react";

export default function JadwalPage() {
  const [search, setSearch] = useState("");

  const data = [
    ["IF101", "Pemrograman Web", "Senin", "08:00 - 10:00", "Ruang A1"],
    ["IF102", "Struktur Data", "Selasa", "10:00 - 12:00", "Ruang B2"],
    ["IF201", "AI", "Rabu", "13:00 - 15:00", "Ruang C3"],
  ];

  const filtered = data.filter((item) =>
    item[1].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar title="Jadwal" subtitle="Kelola jadwal perkuliahan" />

        <div className="p-6 space-y-6">

          {/* HERO */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">Manajemen Jadwal</h1>
            <p className="text-sm text-slate-300 mt-2">
              Atur jadwal mata kuliah dan ruangan
            </p>
          </div>

          {/* TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Jadwal
              </h2>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Cari jadwal..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
                />

                <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600">
                  + Tambah
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">Kode</th>
                    <th>Mata Kuliah</th>
                    <th>Hari</th>
                    <th>Jam</th>
                    <th>Ruangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 font-medium text-slate-800">{item[0]}</td>
                      <td className="text-slate-700">{item[1]}</td>
                      <td className="text-slate-700">{item[2]}</td>
                      <td className="text-slate-700">{item[3]}</td>
                      <td className="text-slate-700">{item[4]}</td>

                      <td className="flex gap-2 py-3">
                        <button className="rounded-lg bg-yellow-100 px-3 py-1 text-xs text-yellow-700 hover:bg-yellow-200">
                          Edit
                        </button>
                        <button className="rounded-lg bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        Data tidak ditemukan
                      </td>
                    </tr>
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