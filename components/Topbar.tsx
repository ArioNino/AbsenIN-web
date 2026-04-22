export default function Topbar() {
  return (
    <header className="bg-white border-b px-8 py-4 flex justify-between items-center">

      <div>
        <h2 className="font-syne text-lg font-bold text-gray-800">
          Dashboard Presensi
        </h2>
        <p className="text-sm text-gray-500">
          Semester Genap 2024/2025
        </p>
      </div>

      <div className="flex items-center gap-3">

        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">
          📅 {new Date().toLocaleDateString("id-ID")}
        </span>

        <button className="w-9 h-9 flex items-center justify-center relative text-gray-600">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">
          + Sesi Baru
        </button>

      </div>
    </header>
  );
}