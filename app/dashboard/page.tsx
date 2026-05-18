"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Plus,
  ScanFace,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import LineChart, {
  type LinePoint,
} from "@/components/charts/LineChart";
import DonutChart, {
  type DonutSegment,
} from "@/components/charts/DonutChart";

type Stats = {
  total_mahasiswa: number;
  total_kelas: number;
  total_bap: number;
  attendance_rate: number;
};

type TodayAttendance = {
  id: number;
  mata_kuliah: string;
  kelas: string;
  waktu_mulai: string;
  waktu_selesai: string;
  hadir: number;
  total: number;
};

type StatusDistribution = {
  status: string;
  total: number;
};

type DailyTrendItem = {
  tanggal: string;
  hadir: number;
  terlambat?: number;
  alpa?: number;
  total?: number;
  rate?: number;
};

const API = "http://127.0.0.1:8000";

// Palette donut sesuai status presensi.
const STATUS_COLOR_MAP: Record<string, string> = {
  Hadir: "#10b981",
  Terlambat: "#f59e0b",
  Izin: "#06b6d4",
  Sakit: "#8b5cf6",
  Alpa: "#f43f5e",
  Alpha: "#f43f5e",
  Tidak_Hadir: "#f43f5e",
  Unknown: "#94a3b8",
};

function formatShortDate(iso: string) {
  // ISO date "2026-05-12" → "12 Mei"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function MetricCard({
  title,
  value,
  delta,
  icon,
  tone = "cyan",
  loading,
}: {
  title: string;
  value: ReactNode;
  delta?: string;
  icon: ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "violet";
  loading?: boolean;
}) {
  const toneMap = {
    cyan: "from-cyan-500/10 to-cyan-500/0 text-cyan-600",
    emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-600",
    amber: "from-amber-500/10 to-amber-500/0 text-amber-600",
    violet: "from-violet-500/10 to-violet-500/0 text-violet-600",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition hover:shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${toneMap[tone]} blur-xl`}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <h3 className="mt-2 font-syne text-2xl font-bold tabular-nums text-slate-900">
            {loading ? (
              <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              value
            )}
          </h3>
          {delta && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {delta}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    total_mahasiswa: 0,
    total_kelas: 0,
    total_bap: 0,
    attendance_rate: 0,
  });

  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistribution[]
  >([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchDashboard = async (days: 7 | 14 | 30) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, todayRes, statusRes, trendRes] = await Promise.all([
        fetch(`${API}/dashboard/stats`, { headers }),
        fetch(`${API}/dashboard/today`, { headers }),
        fetch(`${API}/dashboard/status-distribution`, { headers }),
        fetch(`${API}/dashboard/daily-trend?days=${days}`, { headers }).catch(
          () => null
        ),
      ]);

      const responses = [statsRes, todayRes, statusRes];
      if (
        responses.some((r) => r.status === 401 || r.status === 403)
      ) {
        handleUnauthorized();
        return;
      }

      const [statsData, todayData, statusData] = await Promise.all([
        statsRes.json(),
        todayRes.json(),
        statusRes.json(),
      ]);

      if (!statsRes.ok || !todayRes.ok || !statusRes.ok) {
        throw new Error("Gagal mengambil data dashboard");
      }

      setStats(statsData);
      setTodayAttendance(Array.isArray(todayData) ? todayData : []);
      setStatusDistribution(Array.isArray(statusData) ? statusData : []);

      // Trend bersifat opsional; kalau endpoint belum tersedia, kita generate
      // fallback dari data presensi hari ini supaya chart tetap punya konteks.
      if (trendRes && trendRes.ok) {
        const trendData = await trendRes.json();
        setDailyTrend(Array.isArray(trendData) ? trendData : []);
      } else {
        setDailyTrend([]);
      }
    } catch (error) {
      console.error(error);
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
    fetchDashboard(trendDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDays]);

  // Kalau backend belum punya endpoint daily-trend, sintesa data dari
  // presensi hari ini supaya chart tidak kosong saat preview/dev.
  const trendForChart: LinePoint[] = useMemo(() => {
    if (dailyTrend.length > 0) {
      return dailyTrend.map((d) => ({
        label: formatShortDate(d.tanggal),
        value:
          typeof d.rate === "number"
            ? Math.round(d.rate)
            : typeof d.total === "number" && d.total > 0
            ? Math.round((d.hadir / d.total) * 100)
            : d.hadir,
      }));
    }

    // Fallback: 0 selama N-1 hari + nilai hari ini.
    const today =
      todayAttendance.length > 0
        ? Math.round(
            (todayAttendance.reduce((s, a) => s + a.hadir, 0) /
              Math.max(
                1,
                todayAttendance.reduce((s, a) => s + a.total, 0)
              )) *
              100
          )
        : stats.attendance_rate;

    const out: LinePoint[] = [];
    const todayDate = new Date();
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      out.push({
        label: d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        value: i === 0 ? today : 0,
      });
    }
    return out;
  }, [dailyTrend, trendDays, todayAttendance, stats.attendance_rate]);

  const donutData: DonutSegment[] = useMemo(
    () =>
      statusDistribution.map((d) => ({
        label: d.status,
        value: d.total,
        color: STATUS_COLOR_MAP[d.status] ?? "#94a3b8",
      })),
    [statusDistribution]
  );

  const totalDonut = donutData.reduce((s, d) => s + d.value, 0);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 19) return "Selamat sore";
    return "Selamat malam";
  }, []);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Monitoring sistem presensi mahasiswa"
      actions={
        <button
          onClick={() => router.push("/bap")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Sesi Baru
        </button>
      }
    >
      {/* HERO */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-[0_4px_20px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              {greeting}
              {user?.name ? `, ${user.name}` : ""}
            </p>
            <h1 className="font-syne mt-2 text-2xl font-bold leading-tight">
              Dashboard Presensi
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Pantau ringkasan kehadiran mahasiswa, sesi BAP yang sedang berjalan,
              dan tren presensi harian secara realtime.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Tingkat Kehadiran
              </p>
              <p className="font-syne text-2xl font-bold tabular-nums">
                {loading ? "—" : `${stats.attendance_rate}%`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* METRIC CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Mahasiswa"
          value={stats.total_mahasiswa}
          icon={<Users className="h-5 w-5" />}
          tone="cyan"
          loading={loading}
        />
        <MetricCard
          title="Total Mata Kuliah"
          value={stats.total_kelas}
          icon={<BookOpen className="h-5 w-5" />}
          tone="violet"
          loading={loading}
        />
        <MetricCard
          title="Total BAP"
          value={stats.total_bap}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="amber"
          loading={loading}
        />
        <MetricCard
          title="Kehadiran Hari Ini"
          value={`${stats.attendance_rate}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          loading={loading}
        />
      </section>

      {/* GRAFIK + DONUT */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tren Kehadiran Harian
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Persentase kehadiran {trendDays} hari terakhir
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    trendDays === d
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {d}H
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-[220px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
              Memuat grafik…
            </div>
          ) : (
            <LineChart
              data={trendForChart}
              suffix="%"
              height={240}
              color="#06b6d4"
            />
          )}

          {dailyTrend.length === 0 && !loading && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Endpoint <code className="rounded bg-slate-100 px-1">/dashboard/daily-trend</code>{" "}
              belum tersedia · menampilkan data hari ini saja.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Distribusi Kehadiran
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Komposisi status presensi
            </p>
          </div>

          {loading ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              Memuat…
            </div>
          ) : donutData.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <ClipboardList className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Belum ada distribusi</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <DonutChart
                data={donutData}
                size={170}
                centerLabel="Total"
                centerValue={totalDonut}
              />

              <div className="grid w-full gap-2">
                {donutData.map((d) => {
                  const pct =
                    totalDonut > 0
                      ? Math.round((d.value / totalDonut) * 100)
                      : 0;
                  return (
                    <div
                      key={d.label}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: d.color }}
                        />
                        {d.label}
                      </span>
                      <span className="text-xs tabular-nums text-slate-600">
                        {d.value}{" "}
                        <span className="text-slate-400">· {pct}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TODAY ATTENDANCE + SHORTCUT */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Presensi Hari Ini
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Sesi BAP yang berjalan / sudah dilakukan hari ini
              </p>
            </div>

            <button
              onClick={() => router.push("/riwayat")}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700"
            >
              Riwayat lengkap
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))
            ) : todayAttendance.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <ClipboardList className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Belum ada presensi hari ini
                </p>
                <p className="text-xs text-slate-500">
                  Mulai sesi baru untuk mencatat kehadiran.
                </p>
              </div>
            ) : (
              todayAttendance.map((item) => {
                const pct =
                  item.total > 0
                    ? Math.round((item.hadir / item.total) * 100)
                    : 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200/70 p-4 transition hover:border-cyan-200 hover:bg-cyan-50/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {item.mata_kuliah}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.kelas}{" "}
                          <span className="text-slate-300">·</span>{" "}
                          {item.waktu_mulai} - {item.waktu_selesai}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-emerald-600">
                            {item.hadir}/{item.total}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Hadir
                          </p>
                        </div>
                        <div className="relative h-9 w-9">
                          <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${(pct / 100) * 87.96} 87.96`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-700">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SHORTCUTS */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-900">
              Aksi Cepat
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Akses fitur yang sering digunakan
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => router.push("/bap")}
                className="group flex w-full items-center justify-between rounded-xl bg-cyan-600 px-4 py-3 text-left text-sm font-medium text-white shadow-sm transition hover:bg-cyan-700"
              >
                <span className="inline-flex items-center gap-2">
                  <ScanFace className="h-4 w-4" />
                  Buat BAP &amp; Mulai Presensi
                </span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={() => router.push("/riwayat")}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  Lihat Riwayat BAP
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </button>

              <button
                onClick={() => router.push("/mahasiswa")}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  Kelola Data Mahasiswa
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-900">
              Status Sistem
            </h2>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="text-xs font-medium text-emerald-700">
                  Backend API
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-cyan-50 px-3 py-2">
                <span className="text-xs font-medium text-cyan-700">
                  Face Recognition
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                  Ready
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs font-medium text-slate-700">
                  Mode Presensi
                </span>
                <span className="text-xs font-medium text-slate-700">
                  Realtime + Manual
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
