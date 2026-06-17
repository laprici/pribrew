/* View-models: traducen filas de Supabase a las formas que consumen las
   pantallas rediseñadas, derivando lo que la DB no almacena
   (color desde el tueste, score desde rating, target desde el método). */

import { METHOD_LABELS, type MethodKey } from "./method";

export type BrewTarget = {
  ratioLow: number;
  ratioHigh: number;
  tempLow: number;
  tempHigh: number;
};

export type BeanVM = {
  id: string;
  origin: string;
  country: string;
  variety: string;
  process: string;
  roast: string;
  roastDate: string;
  notes: string[];
  stock: number;
  color: string;
};

export type BrewVM = {
  id: string;
  bean: BeanVM | null;
  method: string;
  methodKey: string;
  date: string;
  dose: number;
  water: number;
  temp: number;
  grind: string;
  timeSec: number;
  score: number;
  verdict: string;
  notes: string;
  target: BrewTarget;
};

const PROCESS_LABELS: Record<string, string> = {
  washed: "Lavado",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaeróbico",
  other: "Otro",
};

const ROAST_LABELS: Record<string, string> = {
  light: "Claro",
  "medium-light": "Medio-claro",
  medium: "Medio",
  "medium-dark": "Medio-oscuro",
  dark: "Oscuro",
};

const ROAST_COLORS: Record<string, string> = {
  light: "#C99A4E",
  "medium-light": "#C97A3D",
  medium: "#A85F33",
  "medium-dark": "#7A4524",
  dark: "#5A3019",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Parte las notas del tostador en chips (separadas por coma, punto y coma o salto). */
function parseNotes(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function toBeanVM(r: any): BeanVM {
  return {
    id: r.id,
    origin: r.region || r.origin_country || r.name || "Grano",
    country: r.origin_country || "—",
    variety: r.variety || "—",
    process: r.process ? PROCESS_LABELS[r.process] ?? r.process : "—",
    roast: r.roast_level ? ROAST_LABELS[r.roast_level] ?? r.roast_level : "—",
    roastDate: r.roast_date || r.created_at || "",
    notes: parseNotes(r.roaster_notes),
    stock: r.remaining_g ?? r.weight_g ?? 0,
    color: (r.roast_level && ROAST_COLORS[r.roast_level]) || "#8A4B2A",
  };
}

/** rating (1–5) → puntuación 0–10; si no hay rating, promedia las dimensiones de cata. */
function scoreFromRow(r: any): number {
  if (r.rating != null) return round1(r.rating * 2);
  const dims = [r.acidity, r.sweetness, r.bitterness, r.body, r.aftertaste].filter(
    (x: any) => x != null
  );
  if (dims.length) {
    const avg = dims.reduce((a: number, b: number) => a + b, 0) / dims.length;
    return round1(avg * 2);
  }
  return 0;
}

function verdictFromRow(r: any): string {
  if (Array.isArray(r.outcome_tags) && r.outcome_tags.length) return r.outcome_tags[0];
  if (r.rating != null) return r.rating >= 4 ? "Logrado" : r.rating >= 3 ? "Aceptable" : "Por ajustar";
  return "Sin cata";
}

/** Rango objetivo derivado del método (default_ratio/temp ± banda). */
function targetFor(methodRow: any, methodKey: string): BrewTarget {
  const ratio = methodRow?.default_ratio ?? 16;
  const temp = methodRow?.default_temp_c ?? 93;
  const band = ratio < 5 ? 0.3 : 1.5; // espresso/moka vs filtrado
  return {
    ratioLow: round1(ratio - band),
    ratioHigh: round1(ratio + band),
    tempLow: Math.round(temp - 3),
    tempHigh: Math.round(temp + 3),
  };
}

export function toBrewVM(r: any): BrewVM {
  const bean = r.bean ? toBeanVM(r.bean) : null;
  const methodKey: string = r.method?.key ?? r.method_params?.method ?? "";
  const methodLabel =
    r.method?.name ?? METHOD_LABELS[methodKey as MethodKey] ?? (methodKey || "—");
  return {
    id: r.id,
    bean,
    method: methodLabel,
    methodKey,
    date: r.brewed_at ?? r.created_at ?? "",
    dose: Number(r.dose_g ?? 0),
    water: Number(r.yield_g ?? 0),
    temp: Number(r.water_temp_c ?? 0),
    grind: r.grind_setting ?? "—",
    timeSec: Number(r.total_time_s ?? 0),
    score: scoreFromRow(r),
    verdict: verdictFromRow(r),
    notes: r.notes ?? "",
    target: targetFor(r.method, methodKey),
  };
}

/** Días desde una fecha ISO (acepta solo-fecha o fecha-hora). */
export function daysSince(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
}
