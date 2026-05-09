"use client";

import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login gagal");
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("token_type", data.token_type);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login berhasil!");

      router.push("/dashboard");
    } catch (error: any) {
      setMessage(error.message || "Terjadi kesalahan saat login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-100">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_35%)]" />

        <div className="relative z-10 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-900">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">AbsenIN</h1>
                <p className="text-sm text-slate-300">
                  Smart Attendance System
                </p>
              </div>
            </div>

            <div className="mt-20 max-w-md">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                Welcome Back
              </p>

              <h2 className="mt-4 text-5xl font-bold leading-tight">
                Face Recognition Attendance Platform
              </h2>

              <p className="mt-5 text-slate-300 leading-7">
                Kelola presensi mahasiswa secara cepat, aman, dan realtime
                menggunakan teknologi AI.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">98%</p>
              <span className="text-xs text-slate-300">Accuracy</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">24/7</p>
              <span className="text-xs text-slate-300">Realtime</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold">1000+</p>
              <span className="text-xs text-slate-300">Students</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500 text-white lg:hidden">
              <ShieldCheck size={26} />
            </div>

            <h2 className="mt-4 text-3xl font-bold text-slate-900">
              Sign In
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Login untuk masuk ke dashboard AbsenIN
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                placeholder="admin@kampus.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-2xl border text-black border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-2xl border text-black border-slate-300 px-4 py-3 pr-12 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {message && (
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>

              <Link
                href="#"
                className="font-medium text-cyan-600 hover:text-cyan-700"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Need help?{" "}
            <Link
              href="#"
              className="font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Contact Administrator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}