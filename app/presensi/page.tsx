"use client";

import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type FaceResult = {
  face_index: number;
  nim: string | null;
  nama: string | null;
  prodi: string | null;
  confidence: number;
  detection_confidence: number | null;
  bbox: number[] | null;
  recognized: boolean;
  mahasiswa_found: boolean;
};

type LogItem = {
  nama: string;
  nim: string;
  prodi: string;
  jam: string;
  confidence: string;
  status: string;
};

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

export default function PresensiRealtimePage() {
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFace, setLastFace] = useState<FaceResult | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);

  const handleFullscreen = () => {
    if (!cameraContainerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      cameraContainerRef.current.requestFullscreen();
    }
  };

  const getScaledBox = () => {
    if (!lastFace?.bbox || !cameraContainerRef.current) return null;

    const [x1, y1, x2, y2] = lastFace.bbox;

    const containerWidth = cameraContainerRef.current.clientWidth;
    const containerHeight = cameraContainerRef.current.clientHeight;

    const scaleX = containerWidth / VIDEO_WIDTH;
    const scaleY = containerHeight / VIDEO_HEIGHT;

    return {
      left: x1 * scaleX,
      top: y1 * scaleY,
      width: (x2 - x1) * scaleX,
      height: (y2 - y1) * scaleY,
    };
  };

  const handleRecognize = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const screenshot = webcamRef.current?.getScreenshot();

      if (!screenshot) return;

      const blob = await fetch(screenshot).then((res) => res.blob());

      const formData = new FormData();
      formData.append("file", blob, "face.jpg");

      const response = await fetch(
        "http://127.0.0.1:8000/face-recognition/recognize",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Gagal deteksi wajah");
      }

      const face: FaceResult | null = result.data?.[0] ?? null;

      setLastFace(face);

      if (face) {
        const now = new Date();

        const jam = now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const newLog: LogItem = {
          nama: face.nama ?? "Unknown Face",
          nim: face.nim ?? "-",
          prodi: face.prodi ?? "-",
          jam,
          confidence: `${(face.confidence * 100).toFixed(2)}%`,
          status: face.recognized ? "Hadir" : "Unknown",
        };

        setLogs((prev) => [newLog, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error(error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cameraOn) {
      setLastFace(null);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      return;
    }

    intervalRef.current = setInterval(() => {
      handleRecognize();
    }, 1500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cameraOn]);

  const box = getScaledBox();

  const confidenceText = lastFace
    ? `${(lastFace.confidence * 100).toFixed(2)}%`
    : "-";

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
                  Kamera sedang memantau area masuk kelas secara realtime.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {confidenceText}
                  </p>
                  <span className="text-xs text-slate-300">Confidence</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {logs.length}
                  </p>
                  <span className="text-xs text-slate-300">
                    Scan Hari Ini
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">1</p>
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
                ref={cameraContainerRef}
                className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl bg-black"
              >
                {cameraOn ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: VIDEO_WIDTH,
                        height: VIDEO_HEIGHT,
                        facingMode: "user",
                      }}
                      className="h-full w-full object-fill"
                    />

                    {box && (
                      <>
                        <div
                          className="absolute rounded-xl border-[3px] border-cyan-400 transition-all duration-200"
                          style={{
                            left: `${box.left}px`,
                            top: `${box.top}px`,
                            width: `${box.width}px`,
                            height: `${box.height}px`,
                          }}
                        />

                        <div
                          className="absolute rounded-full bg-cyan-500 px-3 py-1 text-xs font-medium text-white shadow transition-all duration-200"
                          style={{
                            left: `${box.left}px`,
                            top: `${Math.max(box.top - 36, 10)}px`,
                          }}
                        >
                          {lastFace?.nama ?? "Unknown"} • {confidenceText}
                        </div>
                      </>
                    )}

                    <div className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                      CAM-01 • Ruang B3
                    </div>

                    <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white animate-pulse">
                      {loading ? "SCANNING" : "LIVE"}
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
                  <div
                    className={`rounded-2xl border p-4 ${
                      lastFace?.recognized
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="text-sm text-slate-500">Status Deteksi</p>

                    <p className="text-lg font-semibold text-slate-800">
                      {!lastFace
                        ? "Belum ada scan"
                        : lastFace.recognized
                        ? "Wajah dikenali"
                        : "Wajah tidak dikenali"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Nama</p>

                    <p className="font-medium text-slate-800">
                      {lastFace?.nama ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">NIM</p>

                    <p className="font-medium text-slate-800">
                      {lastFace?.nim ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Program Studi</p>

                    <p className="font-medium text-slate-800">
                      {lastFace?.prodi ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-sm text-slate-500">Confidence</p>

                    <p className="font-medium text-cyan-600">
                      {confidenceText}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-slate-500">Status</p>

                    <span className="mt-1 inline-block rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-800">
                      {lastFace?.recognized ? "Hadir" : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                  Aktivitas Live
                </h3>

                <div className="space-y-4 text-sm">
                  {logs.length === 0 ? (
                    <p className="text-slate-500">
                      Belum ada aktivitas realtime
                    </p>
                  ) : (
                    logs.slice(0, 3).map((item, index) => (
                      <div key={index}>
                        <p className="font-medium text-slate-800">
                          {item.nama}
                        </p>

                        <p className="text-slate-500">
                          {item.status} • {item.jam}
                        </p>
                      </div>
                    ))
                  )}
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
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-slate-500"
                      >
                        Belum ada data presensi
                      </td>
                    </tr>
                  ) : (
                    logs.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 text-slate-800">{item.nama}</td>
                        <td className="text-slate-700">{item.nim}</td>
                        <td className="text-slate-700">{item.prodi}</td>
                        <td className="text-slate-700">{item.jam}</td>

                        <td className="font-medium text-slate-800">
                          {item.confidence}
                        </td>

                        <td>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              item.status === "Hadir"
                                ? "bg-green-100 text-green-700"
                                : item.status === "Terlambat"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.status}
                          </span>
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