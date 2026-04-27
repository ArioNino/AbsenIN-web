"use client";

import { useRef, useState } from "react";
import Webcam from "react-webcam";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function PresensiRealtimePage() {
  const [cameraOn, setCameraOn] = useState(false);
  const [detected] = useState(true);

  const cameraRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    if (!cameraRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      cameraRef.current.requestFullscreen();
    }
  };

  const logs = [
    ["Rizky Darmawan", "21TK001", "Teknik Informatika", "07:41", "98%", "Terlambat"],
    ["Nadia Sari", "21TK048", "Sistem Informasi", "07:43", "97%", "Hadir"],
    ["Unknown Face", "-", "-", "07:44", "60%", "Unknown"],
    ["Lestari Putri", "22TK011", "Teknik Informatika", "07:46", "99%", "Hadir"],
  ];

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Presensi Realtime"
          subtitle="Monitoring scan wajah mahasiswa secara langsung"
        />

        <div className="p-6 space-y-6">
          {/* HERO */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-sm text-green-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse"></span>
                  Sistem Aktif
                </p>

                <h1 className="mt-2 text-2xl font-bold">
                  Face Recognition Attendance
                </h1>

                <p className="mt-2 text-sm text-slate-300">
                  Kamera sedang memantau area masuk kelas.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                  <p className="text-xl font-bold text-white">98.7%</p>
                  <span className="text-xs text-slate-300">Akurasi</span>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                  <p className="text-xl font-bold text-white">127</p>
                  <span className="text-xs text-slate-300">Scan Hari Ini</span>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center border border-white/10">
                  <p className="text-xl font-bold text-white">4</p>
                  <span className="text-xs text-slate-300">Kamera</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* CAMERA */}
            <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  Kamera Realtime
                </h2>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition ${
                      cameraOn
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
                  </button>

                  <button
                    onClick={handleFullscreen}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Full Screen
                  </button>
                </div>
              </div>

              <div
                ref={cameraRef}
                className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl bg-black"
              >
                {cameraOn ? (
                  <>
                    <Webcam
                      audio={false}
                      mirrored
                      className="h-full w-full object-cover"
                    />

                    {detected && (
                      <>
                        <div className="absolute left-24 top-24 h-52 w-44 rounded-xl border-[3px] border-cyan-400"></div>

                        <div className="absolute left-24 top-[74px] rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium text-white shadow">
                          Rizky Darmawan • 98%
                        </div>
                      </>
                    )}

                    <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                      CAM-01 • Ruang B3
                    </div>

                    <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white animate-pulse">
                      LIVE
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-xl font-semibold text-white">
                      Kamera Nonaktif
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Tekan tombol nyalakan kamera
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                  Hasil Deteksi
                </h3>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-slate-500">Nama</p>
                    <p className="text-lg font-semibold text-slate-800">
                      Rizky Darmawan
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">NIM</p>
                    <p className="font-medium text-slate-800">21TK001</p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Program Studi</p>
                    <p className="font-medium text-slate-800">
                      Teknik Informatika
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Confidence</p>
                    <p className="font-medium text-cyan-600">98%</p>
                  </div>

                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-sm text-slate-500">Status</p>
                    <span className="mt-1 inline-block rounded-full bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-800">
                      Terlambat
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                  Aktivitas Live
                </h3>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      Rizky Darmawan
                    </p>
                    <p className="text-slate-500">
                      Terlambat • 07:41
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-800">
                      Nadia Sari
                    </p>
                    <p className="text-slate-500">
                      Hadir • 07:43
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-800">
                      Unknown Face
                    </p>
                    <p className="text-slate-500">
                      Tidak dikenali • 07:44
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Riwayat Presensi Hari Ini
              </h2>

              <input
                type="text"
                placeholder="Cari mahasiswa..."
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3">Nama</th>
                    <th>NIM</th>
                    <th>Prodi</th>
                    <th>Jam</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-4 text-slate-800">{item[0]}</td>
                      <td className="text-slate-700">{item[1]}</td>
                      <td className="text-slate-700">{item[2]}</td>
                      <td className="text-slate-700">{item[3]}</td>
                      <td className="font-medium text-slate-800">
                        {item[4]}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item[5] === "Hadir"
                              ? "bg-green-100 text-green-700"
                              : item[5] === "Terlambat"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item[5]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}