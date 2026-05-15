"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import Swal from "sweetalert2";
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

type ActiveBap = {
  id?: number;
  id_kelas?: number;
  id_mata_kuliah?: string;
  nama_mk?: string;
  mata_kuliah?: {
    nama_mk?: string;
    kode_mk?: string;
  };
  waktu_mulai?: string;
  waktu_selesai?: string;
  tanggal?: string;
  pertemuan_ke?: number;
  materi?: string;
};

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

export default function PresensiRealtimePage() {
  const router = useRouter();

  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFace, setLastFace] = useState<FaceResult | null>(null);
  const [lastStatus, setLastStatus] = useState("-");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [activeBap, setActiveBap] = useState<ActiveBap | null>(null);

  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedBap = localStorage.getItem("active_bap");

    if (!token) {
      router.push("/login");
      return;
    }

    if (!storedBap) {
      Swal.fire({
        icon: "warning",
        title: "BAP belum dibuat",
        text: "Silakan isi Berita Acara Perkuliahan terlebih dahulu sebelum membuka presensi.",
        confirmButtonText: "Oke",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/bap");
        }
      });

      return;
    }

    setActiveBap(JSON.parse(storedBap));
  }, [router]);

  const handleEndSession = () => {
    Swal.fire({
      icon: "question",
      title: "Akhiri sesi presensi?",
      text: "BAP aktif akan ditutup dan Anda akan diarahkan kembali ke halaman BAP.",
      showCancelButton: true,
      confirmButtonText: "Ya, akhiri",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    }).then((result) => {
      if (result.isConfirmed) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        setCameraOn(false);
        setLastFace(null);
        setLastStatus("-");
        setLogs([]);

        localStorage.removeItem("active_bap");

        Swal.fire({
          icon: "success",
          title: "Sesi diakhiri",
          text: "Sesi presensi berhasil diakhiri.",
          timer: 1200,
          showConfirmButton: false,
        });

        setTimeout(() => {
          router.push("/bap");
        }, 1200);
      }
    });
  };

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

  const getStatusFromBackend = (message?: string) => {
    if (!message) return "Unknown";

    if (message.toLowerCase().includes("terlambat")) {
      return "Terlambat";
    }

    if (message.toLowerCase().includes("hadir")) {
      return "Hadir";
    }

    return "Unknown";
  };

  const handleRecognize = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);

      const token = localStorage.getItem("token");
      const activeBapData = localStorage.getItem("active_bap");
      const bap = activeBapData ? JSON.parse(activeBapData) : null;

      if (!token) {
        router.push("/login");
        return;
      }

      if (!bap?.id) {
        router.push("/bap");
        return;
      }

      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) return;

      const blob = await fetch(screenshot).then((res) => res.blob());

      const formData = new FormData();
      formData.append("id_bap", String(bap.id));
      formData.append("mode", "single");
      formData.append("file", blob, "face.jpg");

      const response = await fetch("http://127.0.0.1:8000/kehadiran/recognize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Gagal deteksi wajah");
      }

      const item = result.results?.[0] ?? null;

      const face: FaceResult | null = item
        ? {
            face_index: item.face_index,
            nim: item.nim,
            nama: item.mahasiswa?.nama ?? null,
            prodi: item.mahasiswa?.prodi ?? null,
            confidence: item.confidence,
            detection_confidence: item.detection_confidence,
            bbox: item.bbox,
            recognized: Boolean(item.mahasiswa),
            mahasiswa_found: Boolean(item.mahasiswa),
          }
        : null;

      setLastFace(face);

      if (face) {
        const now = new Date();

        const jam = now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const status = face.recognized
          ? getStatusFromBackend(item?.message)
          : "Unknown";

        setLastStatus(status);

        const newLog: LogItem = {
          nama: face.nama ?? "Unknown Face",
          nim: face.nim ?? "-",
          prodi: face.prodi ?? "-",
          jam,
          confidence: `${(face.confidence * 100).toFixed(2)}%`,
          status,
        };

        setLogs((prev) => [newLog, ...prev].slice(0, 10));
      } else {
        setLastStatus("-");
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
      setLastStatus("-");

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
  }, [cameraOn, activeBap]);

  const box = getScaledBox();

  const confidenceText = lastFace
    ? `${(lastFace.confidence * 100).toFixed(2)}%`
    : "-";

  const namaMataKuliah =
    activeBap?.mata_kuliah?.nama_mk ||
    activeBap?.nama_mk ||
    activeBap?.id_mata_kuliah ||
    "-";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Presensi Realtime"
          subtitle="Monitoring scan wajah mahasiswa secara langsung"
        />

        <div className="p-6 space-y-6">
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
                  <p className="text-xl font-bold text-white">{logs.length}</p>
                  <span className="text-xs text-slate-300">Scan Hari Ini</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">1</p>
                  <span className="text-xs text-slate-300">Kamera</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Informasi BAP Aktif
            </h2>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Mata Kuliah</p>
                <p className="font-semibold text-slate-800">{namaMataKuliah}</p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Pertemuan</p>
                <p className="font-semibold text-slate-800">
                  {activeBap?.pertemuan_ke
                    ? `Pertemuan ke-${activeBap.pertemuan_ke}`
                    : "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Waktu Mulai</p>
                <p className="font-semibold text-slate-800">
                  {activeBap?.waktu_mulai ?? "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-sm text-slate-500">Waktu Selesai</p>
                <p className="font-semibold text-slate-800">
                  {activeBap?.waktu_selesai ?? "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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

                  <button
                    onClick={handleEndSession}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    Akhiri Sesi
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

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Status</p>

                    <span
                      className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        lastStatus === "Hadir"
                          ? "bg-green-200 text-green-800"
                          : lastStatus === "Terlambat"
                          ? "bg-yellow-200 text-yellow-800"
                          : lastStatus === "Unknown"
                          ? "bg-red-200 text-red-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {lastStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Riwayat Presensi Hari Ini
              </h2>
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