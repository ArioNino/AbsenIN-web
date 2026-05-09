"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useState } from "react";

export default function BAPPage() {
  const [form, setForm] = useState({
    matkul: "",
    tanggal: "",
    pertemuan: "",
    materi: "",
    catatan: "",
  });

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="BAP Perkuliahan"
          subtitle="Isi berita acara perkuliahan"
        />

        <div className="p-6 space-y-6">
          {/* HERO */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold">Berita Acara Perkuliahan</h1>
            <p className="text-sm text-slate-300 mt-2">
              Isi laporan kegiatan perkuliahan
            </p>
          </div>

          {/* FORM */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            {/* ROW 1 */}
            <div className="grid md:grid-cols-3 gap-4">
              <select
                value={form.matkul}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, matkul: e.target.value })
                }
              >
                <option value="">Pilih Mata Kuliah</option>
                <option value="Visual Komputer">Visual Komputer</option>
                <option value="Data Mining">Data Mining</option>
                <option value="Pemrograman Web">Pemrograman Web</option>
                <option value="Basis Data">Basis Data</option>
              </select>

              <input
                type="date"
                value={form.tanggal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, tanggal: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Pertemuan ke-"
                value={form.pertemuan}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(e) =>
                  setForm({ ...form, pertemuan: e.target.value })
                }
              />
            </div>

            {/* MATERI */}
            <textarea
              placeholder="Materi yang diajarkan..."
              rows={4}
              value={form.materi}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(e) => setForm({ ...form, materi: e.target.value })}
            />

            {/* CATATAN */}
            <textarea
              placeholder="Catatan tambahan..."
              rows={3}
              value={form.catatan}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            />

            {/* BUTTON */}
            <div className="flex justify-end gap-3">
              <button className="rounded-xl bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300">
                Batal
              </button>

              <button className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600">
                Simpan BAP
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}