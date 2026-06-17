import type { ReactNode } from "react";
import { formatTime } from "@/domain/calc";

/* ---------------- helpers de formato ---------------- */

export function fmtTime(s: number): string {
  return formatTime(s);
}

export function ratioVal(dose: number, water: number): number {
  return dose > 0 ? water / dose : 0;
}

export function fmtRatio(dose: number, water: number): string {
  const r = ratioVal(dose, water);
  if (!r) return "1:—";
  return "1:" + r.toFixed(1).replace(/\.0$/, "");
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return day.replace(".", "") + " · " + time;
}

export type Tone = "signal" | "warn" | null | undefined;

export function freshnessTone(days: number): Tone {
  return days <= 5 ? "signal" : days <= 14 ? null : "warn";
}

export function freshnessLabel(days: number): string {
  return days <= 5 ? "Fresco" : days <= 14 ? "Óptimo" : days <= 25 ? "Maduro" : "Viejo";
}

function toneColor(tone: Tone, accent?: boolean): string {
  if (tone === "signal") return "var(--signal)";
  if (tone === "warn") return "var(--warn)";
  return accent ? "var(--accent)" : "var(--ink)";
}

/* ---------------- átomos ---------------- */

export function Card({
  children,
  onClick,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`card transition-[border-color,transform] duration-150 ease-ease ${
        pad ? "p-[var(--pad)]" : ""
      } ${onClick ? "cursor-pointer hover:border-hairline-strong" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function MethodBadge({ method, small }: { method: string; small?: boolean }) {
  return (
    <span
      className={`mono inline-flex items-center rounded-pill border border-hairline bg-chip uppercase tracking-[0.14em] font-medium text-ink-soft ${
        small ? "text-[9px] px-1.5 py-[3px]" : "text-[10px] px-2.5 py-1"
      }`}
    >
      {method}
    </span>
  );
}

export function ScoreRing({ score, size = 46 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline-strong)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s var(--ease, ease)" }}
        />
      </svg>
      <div
        className="mono absolute inset-0 grid place-items-center font-medium text-ink"
        style={{ fontSize: size * 0.3 }}
      >
        {score.toFixed(1)}
      </div>
    </div>
  );
}

export function Readout({
  k,
  v,
  unit,
  big,
  accent,
  tone,
}: {
  k: string;
  v: ReactNode;
  unit?: string;
  big?: boolean;
  accent?: boolean;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="tag">{k}</span>
      <span
        className="mono font-medium leading-none whitespace-nowrap"
        style={{ fontSize: big ? 30 : 19, color: toneColor(tone, accent) }}
      >
        {v}
        {unit && <span className="ml-[3px] text-[0.55em] text-muted">{unit}</span>}
      </span>
    </div>
  );
}

export function NoteChip({ children }: { children: ReactNode }) {
  return <span className="chip-note">{children}</span>;
}

export function ScreenHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 pb-4">
      <div className="min-w-0 flex-1">
        {sub && <div className="tag mb-1">{sub}</div>}
        <h1 className="text-2xl font-semibold tracking-[-0.03em] leading-none">{title}</h1>
      </div>
      {right}
    </div>
  );
}
