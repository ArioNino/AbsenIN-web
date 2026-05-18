"use client";

import { useId, useMemo, useState } from "react";

export type LinePoint = {
  label: string;
  value: number;
};

type Props = {
  data: LinePoint[];
  height?: number;
  /** Warna utama (stroke + gradient fill). Default cyan. */
  color?: string;
  /** Warna sekunder untuk gradient stop bawah. Default lebih transparan. */
  colorSoft?: string;
  /** Suffix yang ditampilkan pada tooltip / sumbu Y (mis. "%", " mhs"). */
  suffix?: string;
  /** Y axis tetap mulai dari 0; kalau true, biarkan auto-scale dari min. */
  autoScale?: boolean;
  /** Jumlah grid horizontal. Default 4. */
  gridLines?: number;
  /** Tampilkan label Y di kiri. Default true. */
  showYAxis?: boolean;
  className?: string;
};

/**
 * Line + area chart minimalis berbasis SVG, tanpa dependency eksternal.
 * Cocok untuk tren harian (mis. presensi 14 hari terakhir).
 */
export default function LineChart({
  data,
  height = 220,
  color = "#06b6d4",
  colorSoft = "rgba(6, 182, 212, 0.0)",
  suffix = "",
  autoScale = false,
  gridLines = 4,
  showYAxis = true,
  className,
}: Props) {
  const uid = useId();
  const gradId = `lc-grad-${uid}`;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Chart memakai viewBox 1000 x H supaya responsif tanpa hitung container width.
  const W = 1000;
  const padX = showYAxis ? 56 : 24;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX - 24;
  const innerH = height - padTop - padBottom;

  const { yMax, yMin } = useMemo(() => {
    if (data.length === 0) return { yMax: 1, yMin: 0 };
    const vals = data.map((d) => d.value);
    const max = Math.max(...vals);
    const min = autoScale ? Math.min(...vals) : 0;

    // Saat semua nilai 0, beri skala 0..1 (dengan tick desimal) supaya
    // grid label tidak berulang "0,0,0,0,1" yang membingungkan.
    if (max === 0 && min === 0) {
      return { yMax: 1, yMin: 0 };
    }

    // tambah ~10% headroom supaya line tidak menyentuh atas.
    const padded = max * 1.1;
    return { yMax: padded, yMin: min };
  }, [data, autoScale]);

  // Format label sumbu Y: pakai desimal kalau range kecil, integer kalau besar.
  const formatYLabel = (v: number) => {
    if (yMax <= 1) return v.toFixed(2);
    if (yMax < 5) return v.toFixed(1);
    return Math.round(v).toString();
  };

  const yToPx = (v: number) => {
    if (yMax === yMin) return padTop + innerH;
    return padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  };

  const xToPx = (i: number) => {
    if (data.length <= 1) return padX + innerW / 2;
    return padX + (i / (data.length - 1)) * innerW;
  };

  const points = data.map((d, i) => ({
    x: xToPx(i),
    y: yToPx(d.value),
    raw: d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(
          padTop + innerH
        ).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padTop + innerH).toFixed(
          2
        )} Z`
      : "";

  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / gridLines;
    return { v, y: yToPx(v) };
  });

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400 ${className ?? ""}`}
        style={{ height }}
      >
        Belum ada data
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="block w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Grafik tren"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colorSoft} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {gridYs.map((g, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padX}
              x2={W - 24}
              y1={g.y}
              y2={g.y}
              stroke="#E2E8F0"
              strokeDasharray={i === gridLines ? "" : "3 4"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {showYAxis && (
              <text
                x={padX - 8}
                y={g.y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="#94A3B8"
                fontFamily="inherit"
              >
                {Math.round(g.v)}
                {suffix}
              </text>
            )}
          </g>
        ))}

        {/* area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* points + hover targets */}
        {points.map((p, i) => {
          const active = hoverIdx === i;
          return (
            <g key={`p-${i}`}>
              {/* hover hit area (transparan, mempermudah hover) */}
              <rect
                x={p.x - innerW / Math.max(data.length, 1) / 2}
                y={padTop}
                width={innerW / Math.max(data.length, 1)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? 5 : 3}
                fill="#fff"
                stroke={color}
                strokeWidth={2}
                style={{ transition: "r 120ms" }}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* x-axis labels (subset agar tidak crowded) */}
        {data.map((d, i) => {
          const stride = Math.max(1, Math.ceil(data.length / 7));
          if (i % stride !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={`x-${i}`}
              x={xToPx(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#94A3B8"
              fontFamily="inherit"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* tooltip floating */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
          style={{
            left: `${(points[hoverIdx].x / W) * 100}%`,
            top: `${(points[hoverIdx].y / height) * 100}%`,
          }}
        >
          <p className="text-[10px] text-slate-300">
            {data[hoverIdx].label}
          </p>
          <p className="tabular-nums">
            {data[hoverIdx].value}
            {suffix}
          </p>
        </div>
      )}
    </div>
  );
}
