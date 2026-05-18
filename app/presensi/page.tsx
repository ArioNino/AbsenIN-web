"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  BookOpen,
  Camera,
  CameraOff,
  CircleCheck,
  Clock,
  LogOut,
  Maximize2,
  ScanFace,
  Search,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";

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
  confidenceValue: number;
  status: FaceStatus;
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

type StatusFilter = "Semua" | FaceStatus;

const STATUS_FILTERS: StatusFilter[] = [
  "Semua",
  "Hadir",
  "Terlambat",
  "Unknown",
];

// Resolusi yang DI-REQUEST ke kamera lewat `videoConstraints`.
// Resolusi aktual yang dikembalikan browser/driver bisa berbeda; ukuran natural
// yang dipakai untuk skala bbox dibaca runtime via `videoRef.videoWidth/Height`.
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

// ----------------------- Helper UI komponen lokal -----------------------

const STATUS_TONE: Record<
  FaceStatus,
  {
    pill: string;
    bbox: string;
    bboxLabel: string;
    avatar: string;
    barBg: string;
    icon: typeof CircleCheck;
  }
> = {
  Hadir: {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bbox: "border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.55)]",
    bboxLabel: "bg-emerald-500/95",
    avatar: "bg-emerald-100 text-emerald-700",
    barBg: "bg-emerald-500",
    icon: CircleCheck,
  },
  Terlambat: {
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    bbox: "border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.55)]",
    bboxLabel: "bg-amber-500/95",
    avatar: "bg-amber-100 text-amber-700",
    barBg: "bg-amber-500",
    icon: Clock,
  },
  Unknown: {
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    bbox: "border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.55)]",
    bboxLabel: "bg-rose-500/95",
    avatar: "bg-rose-100 text-rose-700",
    barBg: "bg-rose-500",
    icon: TriangleAlert,
  },
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function StatusPill({
  status,
  size = "sm",
}: {
  status: FaceStatus;
  size?: "xs" | "sm";
}) {
  const tone = STATUS_TONE[status];

  const Icon = tone.icon;
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-1"
      : "px-2 py-0.5 text-[11px] gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${tone.pill} ${sizeClass}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function Avatar({
  name,
  recognized,
  status,
}: {
  name?: string | null;
  recognized: boolean;
  status: FaceStatus;
}) {
  const tone = STATUS_TONE[status];
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${tone.avatar}`}
    >
      {recognized ? getInitials(name) : "?"}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
      ? "bg-cyan-500"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-slate-700">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-cyan-300">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "emerald" | "amber" | "rose";
}) {
  const styles: Record<string, string> = {
    neutral: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 py-2">
      <p className={`text-xl font-bold tabular-nums ${styles[tone]}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

// Komponen kecil yang punya state/interval-nya sendiri supaya tick per detik
// tidak memicu re-render seluruh halaman.
function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const text = now
    ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return <span className={className}>{text}</span>;
}

// ----------------------- Page -----------------------

export default function PresensiRealtimePage() {
  const router = useRouter();

  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFaces, setLastFaces] = useState<FaceResult[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [activeBap, setActiveBap] = useState<ActiveBap | null>(null);
  const [, setResizeTick] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua");

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
        const ts = Date.now();
        const jam = new Date(ts).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Prune key yang sudah lewat window dedup agar Map tidak tumbuh tak terbatas.
        for (const [k, t] of recentLogKeysRef.current) {
          if (ts - t > DEDUP_MS) recentLogKeysRef.current.delete(k);
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
          if (ts - last < DEDUP_MS) return;

          recentLogKeysRef.current.set(key, ts);
          newLogs.push({
            nama: f.nama ?? "Unknown Face",
            nim: f.nim ?? "-",
            prodi: f.prodi ?? "-",
            jam,
            confidence: `${(f.confidence * 100).toFixed(2)}%`,
            confidenceValue: f.confidence,
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

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter !== "Semua" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.nama.toLowerCase().includes(q) ||
        l.nim.toLowerCase().includes(q) ||
        l.prodi.toLowerCase().includes(q)
      );
    });
  }, [logs, search, statusFilter]);

  const confidenceText =
    summary.avgConf !== null ? `${(summary.avgConf * 100).toFixed(1)}%` : "—";

  const namaMataKuliah =
    activeBap?.mata_kuliah?.nama_mk ||
    activeBap?.nama_mk ||
    activeBap?.id_mata_kuliah ||
    "—";

  const kodeMK = activeBap?.mata_kuliah?.kode_mk;

  return (
    <AppShell
      title="Presensi Realtime"
      subtitle="Monitoring scan wajah mahasiswa secara langsung"
    >
      {/* ============== HERO BAR (compact, BAP + status sesi) ============== */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-[0_4px_20px_rgba(15,23,42,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    </span>
                    Sistem Aktif
                  </span>

                  {activeBap?.id !== undefined && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-slate-200">
                      BAP #{activeBap.id}
                    </span>
                  )}

                  {activeBap?.pertemuan_ke && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-slate-200">
                      Pertemuan ke-{activeBap.pertemuan_ke}
                    </span>
                  )}

                  {kodeMK && (
                    <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-cyan-200">
                      {kodeMK}
                    </span>
                  )}
                </div>

                <h1 className="font-syne mt-3 truncate text-2xl font-bold leading-tight">
                  {namaMataKuliah}
                </h1>

                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  Face Recognition Attendance
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <HeroMetric
                  icon={<Clock className="h-4 w-4" />}
                  label="Jadwal"
                  value={
                    <>
                      {activeBap?.waktu_mulai ?? "—"}
                      <span className="mx-1 text-slate-400">·</span>
                      {activeBap?.waktu_selesai ?? "—"}
                    </>
                  }
                />
                <HeroMetric
                  icon={<BookOpen className="h-4 w-4" />}
                  label="Sekarang"
                  value={<LiveClock />}
                />
                <HeroMetric
                  icon={<Users className="h-4 w-4" />}
                  label="Wajah Aktif"
                  value={`${summary.total} terdeteksi`}
                />
              </div>
            </div>
          </section>

          {/* ============== MAIN GRID: kamera + side panel ============== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* --------- KAMERA --------- */}
            <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-cyan-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Kamera Realtime
                  </h2>
                </div>
              </div>

              <div
                ref={cameraContainerRef}
                className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-950"
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
                      className="h-full w-full object-cover"
                    />

                    {lastFaces.map((face, i) => {
                      const box = scaleBox(face.bbox);
                      if (!box) return null;

                      const tone = STATUS_TONE[face.status];
                      const label = face.recognized
                        ? face.nama ?? "Unknown"
                        : "Unknown";
                      const conf = `${(face.confidence * 100).toFixed(0)}%`;

                      // Label adaptif: kalau dekat tepi atas, pindahkan ke dalam box.
                      const labelOutside = box.top >= 32;
                      const labelStyle = labelOutside
                        ? {
                            left: `${box.left}px`,
                            top: `${box.top - 26}px`,
                          }
                        : {
                            left: `${box.left + 6}px`,
                            top: `${box.top + 6}px`,
                          };

                      return (
                        <Fragment key={`face-${face.face_index}-${i}`}>
                          <div
                            className={`absolute rounded-lg border-[3px] transition-[left,top,width,height] duration-100 ${tone.bbox}`}
                            style={{
                              left: `${box.left}px`,
                              top: `${box.top}px`,
                              width: `${box.width}px`,
                              height: `${box.height}px`,
                            }}
                          />

                          <div
                            className={`absolute inline-flex max-w-[180px] items-center gap-1 truncate rounded-md px-2 py-0.5 text-[11px] font-medium text-white shadow-md transition-[left,top] duration-100 ${tone.bboxLabel}`}
                            style={labelStyle}
                          >
                            <span className="truncate">{label}</span>
                            <span className="rounded bg-black/20 px-1 text-[10px] tabular-nums">
                              {conf}
                            </span>
                          </div>
                        </Fragment>
                      );
                    })}

                    {/* Top-left: device chip */}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-200 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                      CAM-01 · Ruang B3
                    </div>

                    {/* Top-right: live/scanning */}
                    <div
                      className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${
                        loading
                          ? "bg-amber-500/90 text-white"
                          : "bg-emerald-500/90 text-white"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full bg-white ${
                          loading ? "animate-pulse" : ""
                        }`}
                      ></span>
                      {loading ? "SCANNING" : "LIVE"}
                    </div>

                    {/* Bottom-left: jam */}
                    <div className="absolute bottom-3 left-3 rounded-md bg-slate-900/70 px-2 py-0.5 text-[11px] tabular-nums text-slate-200 backdrop-blur">
                      <LiveClock />
                    </div>

                    {/* Bottom-right: counter */}
                    <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] text-slate-200 backdrop-blur">
                      <Users className="h-3 w-3 text-cyan-300" />
                      {summary.total} wajah
                      {summary.recognized > 0 && (
                        <>
                          <span className="text-slate-500">·</span>
                          <BadgeCheck className="h-3 w-3 text-emerald-300" />
                          {summary.recognized} dikenali
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                      <CameraOff className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">
                        Kamera Belum Aktif
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Tekan tombol di bawah untuk mulai memindai wajah.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Toolbar di bawah container */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {cameraOn ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                      Memindai realtime · {summary.total} wajah saat ini
                    </span>
                  ) : (
                    <span>
                      Tekan &ldquo;Nyalakan Kamera&rdquo; untuk mulai sesi
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      cameraOn
                        ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500"
                        : "bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-500"
                    }`}
                  >
                    {cameraOn ? (
                      <>
                        <CameraOff className="h-4 w-4" />
                        Matikan Kamera
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Nyalakan Kamera
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleFullscreen}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Full Screen
                  </button>

                  <button
                    onClick={handleEndSession}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Akhiri Sesi
                  </button>
                </div>
              </div>
            </section>

            {/* --------- KOLOM KANAN --------- */}
            <div className="space-y-6">
              {/* Stats ringkas */}
              <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ringkasan
                  </h3>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">
                    Frame terakhir
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <StatBlock label="Total" value={summary.total} tone="neutral" />
                  <StatBlock label="Hadir" value={summary.hadir} tone="emerald" />
                  <StatBlock
                    label="Terlbt."
                    value={summary.terlambat}
                    tone="amber"
                  />
                  <StatBlock
                    label="Unknown"
                    value={summary.unknown}
                    tone="rose"
                  />
                </div>

                {/* Bar segmented rasio */}
                {summary.total > 0 && (
                  <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={STATUS_TONE.Hadir.barBg}
                      style={{
                        width: `${(summary.hadir / summary.total) * 100}%`,
                      }}
                    />
                    <div
                      className={STATUS_TONE.Terlambat.barBg}
                      style={{
                        width: `${(summary.terlambat / summary.total) * 100}%`,
                      }}
                    />
                    <div
                      className={STATUS_TONE.Unknown.barBg}
                      style={{
                        width: `${(summary.unknown / summary.total) * 100}%`,
                      }}
                    />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-cyan-600" />
                    Avg confidence
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {confidenceText}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <span>Scan tercatat hari ini</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {logs.length}
                  </span>
                </div>
              </section>

              {/* Hasil deteksi list */}
              <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Hasil Deteksi
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {summary.total}
                  </span>
                </div>

                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: 380 }}
                  role="status"
                  aria-live="polite"
                >
                  {lastFaces.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <ScanFace className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {cameraOn
                            ? "Mencari wajah…"
                            : "Belum ada wajah terdeteksi"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {cameraOn
                            ? "Pastikan pencahayaan cukup."
                            : "Nyalakan kamera untuk mulai memindai."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    lastFaces.map((face, i) => (
                      <div
                        key={`detail-${face.face_index}-${i}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 transition hover:border-cyan-200 hover:bg-cyan-50/30"
                      >
                        <Avatar
                          name={face.nama}
                          recognized={face.recognized}
                          status={face.status}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {face.recognized
                              ? face.nama ?? "Unknown Face"
                              : "Wajah tidak dikenali"}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {face.recognized
                              ? `${face.nim ?? "-"} · ${face.prodi ?? "-"}`
                              : "Mahasiswa tidak terdaftar"}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusPill status={face.status} size="xs" />
                          <ConfidenceBar value={face.confidence} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* ============== TABEL RIWAYAT ============== */}
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Riwayat Presensi Hari Ini
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredLogs.length} dari {logs.length} entri
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama / NIM / prodi"
                    className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        statusFilter === s
                          ? "bg-cyan-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-3 pr-4 font-medium">Mahasiswa</th>
                    <th className="py-3 pr-4 font-medium">Prodi</th>
                    <th className="py-3 pr-4 font-medium">Jam</th>
                    <th className="py-3 pr-4 font-medium">Confidence</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <Search className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {logs.length === 0
                                ? "Belum ada presensi tercatat"
                                : "Tidak ada entri cocok"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {logs.length === 0
                                ? "Wajah yang terdeteksi akan otomatis tercatat di sini."
                                : "Coba ubah kata kunci atau filter status."}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item, i) => {
                      const tone = STATUS_TONE[item.status];
                      return (
                        <tr
                          key={i}
                          className="border-b border-slate-100 transition hover:bg-slate-50"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${tone.avatar}`}
                              >
                                {item.status === "Unknown"
                                  ? "?"
                                  : getInitials(item.nama)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {item.nama}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                  {item.nim}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              {item.prodi}
                            </span>
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-slate-700">
                            {item.jam}
                          </td>
                          <td className="py-3 pr-4">
                            <ConfidenceBar value={item.confidenceValue} />
                          </td>
                          <td className="py-3">
                            <StatusPill status={item.status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
    </AppShell>
  );
}
