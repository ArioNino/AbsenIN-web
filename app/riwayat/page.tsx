"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useState } from "react";

export default function RiwayatPage() {
  const [search, setSearch] = useState("");

  const data = [
    ["21TK001", "Rizky Darmawan", "Pemrograman Web", "07:41", "Terlambat"],
    ["21TK048", "Nadia Sari", "Struktur Data", "07:30", "Hadir"],
    ["22TK011", "Lestari Putri", "AI", "-", "Alpha"],
  ];

  const filtered = data.filter((item) =>
    item[1].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Riwayat Kehadiran"
          subtitle="Monitoring kehadiran mahasiswa"
        />

        <div className="p-6 space-y-6">

          {/* HERO */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">
              Riwayat Presensi Mahasiswa
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              Data kehadiran berdasarkan hasil face recognition
            </p>
          </div>

          {/* TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Data Kehadiran
              </h2>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Cari mahasiswa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
                />

                <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600">
                  Filter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">NIM</th>
                    <th>Nama</th>
                    <th>Mata Kuliah</th>
                    <th>Jam Masuk</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 font-medium text-slate-800">
                        {item[0]}
                      </td>
                      <td className="text-slate-700">{item[1]}</td>
                      <td className="text-slate-700">{item[2]}</td>
                      <td className="text-slate-700">{item[3]}</td>

                      <td>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item[4] === "Hadir"
                              ? "bg-green-100 text-green-700"
                              : item[4] === "Terlambat"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item[4]}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
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