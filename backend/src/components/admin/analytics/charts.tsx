"use client";

/** Zero-dependency SVG charts for the analytics pages (line/area, bar, h-bar). */
import { cn } from "@/lib/utils";

type Point = { label: string; value: number };

const W = 720;
const H = 200;
const PAD = { l: 6, r: 6, t: 12, b: 22 };

function scales(points: Point[]) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  return { max, innerW, innerH, x, y, baseline: PAD.t + innerH };
}

function XLabels({ points }: { points: Point[] }) {
  const { x } = scales(points);
  const step = Math.max(1, Math.ceil(points.length / 7));
  return (
    <>
      {points.map((p, i) =>
        i % step === 0 || i === points.length - 1 ? (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-zinc-500 text-[9px]">
            {p.label}
          </text>
        ) : null
      )}
    </>
  );
}

function GridLines() {
  return (
    <>
      {[0.25, 0.5, 0.75].map((f) => {
        const yy = PAD.t + (H - PAD.t - PAD.b) * f;
        return <line key={f} x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} className="stroke-white/5" strokeWidth={1} />;
      })}
    </>
  );
}

export function AreaLineChart({ points, format }: { points: Point[]; format: (n: number) => string }) {
  const s = scales(points);
  const line = points.map((p, i) => `${i ? "L" : "M"}${s.x(i).toFixed(1)},${s.y(p.value).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${s.x(points.length - 1).toFixed(1)},${s.baseline} L${s.x(0).toFixed(1)},${s.baseline} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <GridLines />
      {area && <path d={area} fill="url(#areaFill)" />}
      {line && <path d={line} fill="none" className="stroke-cyan-400" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={s.x(i)} cy={s.y(p.value)} r={2.5} className="fill-cyan-300">
          <title>{`${p.label}: ${format(p.value)}`}</title>
        </circle>
      ))}
      <XLabels points={points} />
    </svg>
  );
}

export function BarChart({ points, format }: { points: Point[]; format: (n: number) => string }) {
  const s = scales(points);
  const bw = Math.max(2, (s.innerW / Math.max(1, points.length)) * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
      <GridLines />
      {points.map((p, i) => {
        const h = s.baseline - s.y(p.value);
        return (
          <rect key={i} x={s.x(i) - bw / 2} y={s.y(p.value)} width={bw} height={Math.max(0, h)} rx={2} className="fill-violet-500/70">
            <title>{`${p.label}: ${format(p.value)}`}</title>
          </rect>
        );
      })}
      <XLabels points={points} />
    </svg>
  );
}

export function HBarChart({
  rows,
  format,
  color = "bg-cyan-500/70",
}: {
  rows: { label: string; value: number; sub?: string }[];
  format: (n: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return null;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(90px,1fr)_3fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-zinc-300" title={r.label}>{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <div className={cn("h-full rounded-full", color)} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="whitespace-nowrap text-right tabular-nums text-zinc-200">
            {format(r.value)}
            {r.sub && <span className="ml-1.5 text-xs text-zinc-500">{r.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
