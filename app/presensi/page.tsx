"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import Swal from "sweetalert2";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type FaceStatus = "Hadir" | "Terlambat" | "Unknown";

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
  status: FaceStatus;
  message?: string;
};

type RawRecognizeItem = {
  face_index?: number;
  nim?: string | null;
  mahasiswa?: { nama?: string | null; prodi?: string | null } | null;
  confidence?: number;
  detection_confidence?: number | null;
  bbox?: number[] | null;
  message?: string;
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

// Frekuensi poll minimum antar request ke backend (ms).
// Semakin kecil makin responsif tapi load backend naik.
const MIN_GAP_MS = 350;

// Window dedup log per identitas. Wajah yang sama tidak dilog ulang dalam jendela ini.
const DEDUP_MS = 30_000;

// Berapa kali backend boleh "miss" (tidak ada wajah) sebelum bbox di-clear.
// Membantu mengurangi flicker saat detection sesekali gagal pada satu frame.
const MISS_THRESHOLD = 2;

// Resolusi grid (px frame asli) untuk dedup bucket wajah Unknown berdasarkan posisi bbox.
const UNKNOWN_BUCKET_PX = 60;

export default function PresensiRealtimePage() {
  const router = useRouter();

  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFaces, setLastFaces] = useState<FaceResult[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [activeBap, setActiveBap] = useState<ActiveBap | null>(null);
  const [, setResizeTick] = useState(0);

  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const recentLogKeysRef = useRef<Map<string, number>>(new Map());
  const missCountRef = useRef(0);

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

  const clearScheduled = () => {
    if (scheduleRef.current) {
      clearTimeout(scheduleRef.current);
      scheduleRef.current = null;
    }
  };

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
        clearScheduled();

        setCameraOn(false);
        setLastFaces([]);
        setLogs([]);
        recentLogKeysRef.current.clear();
        missCountRef.current = 0;

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

  const getNaturalSize = () => {
    const video = webcamRef.current?.video as HTMLVideoElement | undefined;
    const naturalW = video?.videoWidth || 0;
    const naturalH = video?.videoHeight || 0;
    return { naturalW, naturalH };
  };

  const scaleBox = (bbox: number[] | null) => {
    if (!bbox || !cameraContainerRef.current) return null;
    if (bbox.length < 4) return null;

    const [x1, y1, x2, y2] = bbox;
    const containerWidth = cameraContainerRef.current.clientWidth;
    const containerHeight = cameraContainerRef.current.clientHeight;
    const { naturalW, naturalH } = getNaturalSize();

    // Sebelum metadata video tersedia, jangan render bbox supaya tidak melenceng.
    if (!naturalW || !naturalH) return null;

    const scaleX = containerWidth / naturalW;
    const scaleY = containerHeight / naturalH;

    // Catatan: react-webcam dengan prop `mirrored` sudah mem-flip canvas pada
    // getScreenshot(), sehingga gambar yang dikirim ke backend SUDAH sejajar
    // dengan tampilan video di layar. Bbox dari backend mengacu ke ruang mirror
    // tersebut, jadi koordinat dipakai apa adanya tanpa flip horizontal.
    const left = x1 * scaleX;
    const top = y1 * scaleY;
    const width = (x2 - x1) * scaleX;
    const height = (y2 - y1) * scaleY;

    return { left, top, width, height };
  };

  const getStatusFromBackend = (message?: string): FaceStatus => {
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
      formData.append("mode", "multi");
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

      const items: RawRecognizeItem[] = Array.isArray(result.results)
        ? (result.results as RawRecognizeItem[])
        : [];

      const faces: FaceResult[] = items.map((item, idx) => {
        const recognized = Boolean(item.mahasiswa);
        return {
          face_index:
            typeof item.face_index === "number" ? item.face_index : idx,
          nim: item.nim ?? null,
          nama: item.mahasiswa?.nama ?? null,
          prodi: item.mahasiswa?.prodi ?? null,
          confidence: Number(item.confidence ?? 0),
          detection_confidence:
            typeof item.detection_confidence === "number"
              ? item.detection_confidence
              : null,
          bbox: Array.isArray(item.bbox) ? item.bbox : null,
          recognized,
          mahasiswa_found: recognized,
          status: recognized
            ? getStatusFromBackend(item.message)
            : ("Unknown" as FaceStatus),
          message: item.message,
        };
      });

      // Tahan bbox terakhir saat backend miss 1 frame untuk kurangi flicker.
      // Setelah lebih dari MISS_THRESHOLD frame berturut tanpa wajah, kosongkan.
      if (faces.length === 0) {
        missCountRef.current += 1;
        if (missCountRef.current >= MISS_THRESHOLD) {
          setLastFaces([]);
        }
      } else {
        missCountRef.current = 0;
        setLastFaces(faces);
      }

      // Logging dengan dedup berdasarkan NIM (recognized) atau bucket bbox (unknown).
      if (faces.length > 0) {
        const now = Date.now();
        const jam = new Date(now).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Prune key yang sudah lewat window dedup agar Map tidak tumbuh tak terbatas.
        for (const [k, t] of recentLogKeysRef.current) {
          if (now - t > DEDUP_MS) recentLogKeysRef.current.delete(k);
        }

        const newLogs: LogItem[] = [];
        faces.forEach((f) => {
          let key: string | null;
          if (f.recognized && f.nim) {
            key = `nim:${f.nim}`;
          } else if (f.bbox && f.bbox.length >= 4) {
            // Bucket berdasarkan center bbox supaya unknown yang sama (posisi mirip)
            // di-dedup, bukan tergantung face_index yang bisa berubah antar frame.
            const [x1, y1, x2, y2] = f.bbox;
            const cx = Math.floor(((x1 + x2) / 2) / UNKNOWN_BUCKET_PX);
            const cy = Math.floor(((y1 + y2) / 2) / UNKNOWN_BUCKET_PX);
            key = `unknown:${cx}:${cy}`;
          } else {
            // Tanpa bbox, jangan log (ambigu) untuk hindari spam.
            key = null;
          }

          if (!key) return;

          const last = recentLogKeysRef.current.get(key) ?? 0;
          if (now - last < DEDUP_MS) return;

          recentLogKeysRef.current.set(key, now);
          newLogs.push({
            nama: f.nama ?? "Unknown Face",
            nim: f.nim ?? "-",
            prodi: f.prodi ?? "-",
            jam,
            confidence: `${(f.confidence * 100).toFixed(2)}%`,
            status: f.status,
          });
        });

        if (newLogs.length) {
          setLogs((prev) => [...newLogs, ...prev].slice(0, 50));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // Self-scheduling poll loop, anti pile-up.
  // Memakai flag `cancelled` lokal per-effect (bukan ref bersama) sehingga
  // toggle camera cepat tidak men-cancel loop yang baru dimulai.
  useEffect(() => {
    if (!cameraOn) {
      clearScheduled();
      setLastFaces([]);
      recentLogKeysRef.current.clear();
      missCountRef.current = 0;
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const t0 =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      await handleRecognize();

      if (cancelled) return;
      const t1 =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const wait = Math.max(MIN_GAP_MS - (t1 - t0), 0);
      scheduleRef.current = setTimeout(tick, wait);
    };

    tick();

    return () => {
      cancelled = true;
      clearScheduled();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, activeBap]);

  // Re-render bbox saat ukuran container berubah (mis. fullscreen).
  useEffect(() => {
    const el = cameraContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      setResizeTick((n) => (n + 1) % 1_000_000);
    });
    ro.observe(el);

    const onFullscreen = () => setResizeTick((n) => (n + 1) % 1_000_000);
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      ro.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [cameraOn]);

  const summary = useMemo(() => {
    const total = lastFaces.length;
    const recognized = lastFaces.filter((f) => f.recognized).length;
    const unknown = total - recognized;
    const hadir = lastFaces.filter((f) => f.status === "Hadir").length;
    const terlambat = lastFaces.filter((f) => f.status === "Terlambat").length;

    const recognizedConfs = lastFaces
      .filter((f) => f.recognized)
      .map((f) => f.confidence);
    const avgConf =
      recognizedConfs.length > 0
        ? recognizedConfs.reduce((a, b) => a + b, 0) / recognizedConfs.length
        : null;

    return { total, recognized, unknown, hadir, terlambat, avgConf };
  }, [lastFaces]);

  const confidenceText =
    summary.avgConf !== null ? `${(summary.avgConf * 100).toFixed(2)}%` : "-";

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
                  <span className="text-xs text-slate-300">Avg Confidence</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">{logs.length}</p>
                  <span className="text-xs text-slate-300">Scan Hari Ini</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {summary.total}
                  </p>
                  <span className="text-xs text-slate-300">Wajah Saat Ini</span>
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
                      forceScreenshotSourceSize
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        width: VIDEO_WIDTH,
                        height: VIDEO_HEIGHT,
                        facingMode: "user",
                      }}
                      className="h-full w-full object-fill"
                    />

                    {lastFaces.map((face, i) => {
                      const box = scaleBox(face.bbox);
                      if (!box) return null;

                      const recognized = face.recognized;
                      const borderColor = recognized
                        ? "border-cyan-400"
                        : "border-red-500";
                      const labelBg = recognized
                        ? "bg-cyan-500"
                        : "bg-red-500";
                      const label = recognized
                        ? face.nama ?? "Unknown"
                        : "Unknown";
                      const conf = `${(face.confidence * 100).toFixed(0)}%`;

                      return (
                        <Fragment key={`face-${face.face_index}-${i}`}>
                          <div
                            className={`absolute rounded-xl border-[3px] ${borderColor} transition-[left,top,width,height] duration-100`}
                            style={{
                              left: `${box.left}px`,
                              top: `${box.top}px`,
                              width: `${box.width}px`,
                              height: `${box.height}px`,
                            }}
                          />

                          <div
                            className={`absolute rounded-full ${labelBg} px-3 py-1 text-xs font-medium text-white shadow transition-[left,top] duration-100`}
                            style={{
                              left: `${box.left}px`,
                              top: `${Math.max(box.top - 28, 6)}px`,
                            }}
                          >
                            {label} • {conf}
                          </div>
                        </Fragment>
                      );
                    })}

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
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Hasil Deteksi
                  </h3>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Total {summary.total}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl bg-green-50 p-3 text-center">
                    <p className="text-lg font-bold text-green-700">
                      {summary.hadir}
                    </p>
                    <span className="text-[11px] text-green-700">Hadir</span>
                  </div>

                  <div className="rounded-xl bg-yellow-50 p-3 text-center">
                    <p className="text-lg font-bold text-yellow-700">
                      {summary.terlambat}
                    </p>
                    <span className="text-[11px] text-yellow-700">
                      Terlambat
                    </span>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3 text-center">
                    <p className="text-lg font-bold text-red-700">
                      {summary.unknown}
                    </p>
                    <span className="text-[11px] text-red-700">Unknown</span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {lastFaces.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-500">
                        Belum ada wajah terdeteksi
                      </p>
                    </div>
                  ) : (
                    lastFaces.map((face, i) => (
                      <div
                        key={`detail-${face.face_index}-${i}`}
                        className={`rounded-2xl border p-3 ${
                          face.recognized
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {face.nama ?? "Unknown Face"}
                            </p>
                            <p className="text-xs text-slate-600">
                              {face.nim ?? "-"} · {face.prodi ?? "-"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              face.status === "Hadir"
                                ? "bg-green-200 text-green-800"
                                : face.status === "Terlambat"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {face.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                          <span>
                            Conf:{" "}
                            <span className="font-medium text-cyan-600">
                              {(face.confidence * 100).toFixed(2)}%
                            </span>
                          </span>
                          {face.detection_confidence !== null && (
                            <span>
                              Det:{" "}
                              {(face.detection_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
