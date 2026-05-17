"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, ClipboardList, Percent } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [statsRes, todayRes, statusRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/dashboard/stats", { headers }),
        fetch("http://127.0.0.1:8000/dashboard/today", { headers }),
        fetch("http://127.0.0.1:8000/dashboard/status-distribution", {
          headers,
        }),
      ]);

      if (
        statsRes.status === 401 ||
        todayRes.status === 401 ||
        statusRes.status === 401 ||
        statsRes.status === 403 ||
        todayRes.status === 403 ||
        statusRes.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      const statsData = await statsRes.json();
      const todayData = await todayRes.json();
      const statusData = await statusRes.json();

      if (!statsRes.ok || !todayRes.ok || !statusRes.ok) {
        throw new Error("Gagal mengambil data dashboard");
      }

      setStats(statsData);
      setTodayAttendance(todayData);
      setStatusDistribution(statusData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchDashboard();
  }, []);

  const cards = [
    {
      title: "Total Mahasiswa",
      value: stats.total_mahasiswa,
      icon: Users,
    },
    {
      title: "Total Kelas",
      value: stats.total_kelas,
      icon: BookOpen,
    },
    {
      title: "Total BAP",
      value: stats.total_bap,
      icon: ClipboardList,
    },
    {
      title: "Kehadiran Hari Ini",
      value: `${stats.attendance_rate}%`,
      icon: Percent,
    },
  ];

  const maxStatusTotal =
    statusDistribution.length > 0
      ? Math.max(...statusDistribution.map((item) => item.total), 1)
      : 1;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-60">
        <Topbar
          title="Dashboard"
          subtitle="Monitoring sistem presensi mahasiswa"
        />

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <h1 className="text-3xl font-bold">Dashboard Presensi</h1>

            <p className="mt-2 text-sm text-slate-300">
              Monitoring sistem absensi berbasis face recognition
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
              const Icon = card.icon;

              return (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.title}</p>

                      <h2 className="mt-2 text-3xl font-bold text-slate-800">
                        {loading ? "..." : card.value}
                      </h2>
                    </div>

                    <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-600">
                      <Icon size={26} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Presensi Hari Ini
                </h2>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    Memuat data...
                  </div>
                ) : todayAttendance.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    Belum ada presensi hari ini
                  </div>
                ) : (
                  todayAttendance.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {item.mata_kuliah}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.kelas}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {item.hadir}/{item.total} Hadir
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {item.waktu_mulai} - {item.waktu_selesai}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Distribusi Kehadiran
                </h2>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    Memuat data...
                  </div>
                ) : statusDistribution.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                    Belum ada data distribusi
                  </div>
                ) : (
                  statusDistribution.map((item, index) => {
                    const percentage =
                      maxStatusTotal > 0
                        ? Math.round((item.total / maxStatusTotal) * 100)
                        : 0;

                    return (
                      <div key={index}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {item.status}
                          </span>

                          <span className="text-slate-500">{item.total}</span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">
                Shortcut
              </h2>

              <div className="mt-5 space-y-3">
                <button
                  onClick={() => router.push("/bap")}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-left text-sm font-medium text-white hover:bg-cyan-600"
                >
                  Buat BAP & Mulai Presensi
                </button>

                <button
                  onClick={() => router.push("/riwayat")}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-medium text-white hover:bg-slate-800"
                >
                  Lihat Riwayat BAP
                </button>

                <button
                  onClick={() => router.push("/mahasiswa")}
                  className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Kelola Data Mahasiswa
                </button>
              </div>
            </div>

            <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">
                Ringkasan Sistem
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Status Sistem</p>
                  <p className="mt-2 font-semibold text-green-600">Aktif</p>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Face Recognition</p>
                  <p className="mt-2 font-semibold text-cyan-600">Ready</p>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">Mode Presensi</p>
                  <p className="mt-2 font-semibold text-slate-800">
                    Realtime + Manual
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                Dashboard ini menampilkan ringkasan data mahasiswa, kelas,
                berita acara perkuliahan, dan distribusi status kehadiran dari
                sistem presensi.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}