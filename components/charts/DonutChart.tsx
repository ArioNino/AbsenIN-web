"use client";

import { useId, useMemo } from "react";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Teks tengah (default = total, dengan label "Total"). */
  centerLabel?: string;
  centerValue?: string | number;
};

/**
 * Donut chart simpel berbasis SVG (stroke-dasharray pada lingkaran).
 * Tidak butuh dependency.
 */
export default function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel = "Total",
  centerValue,
}: Props) {
  const uid = useId();
  const total = useMemo(
    () => data.reduce((acc, d) => acc + (d.value || 0), 0),
    [data]
  );

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Hitung offset kumulatif tiap segmen.
  let offset = 0;
  const segments = data.map((seg, i) => {
    const ratio = total > 0 ? seg.value / total : 0;
    const length = ratio * circumference;
    const item = {
      ...seg,
      key: `${uid}-${i}`,
      length,
      offset,
    };
    offset += length;
    return item;
  });

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((s) => (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={-s.offset}
            />
          ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold tabular-nums text-slate-900">
          {centerValue ?? total}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {centerLabel}
        </p>
      </div>
    </div>
  );
}
