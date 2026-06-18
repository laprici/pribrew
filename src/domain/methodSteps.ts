/* Recetas de extracción por método: pasos ordenados por tiempo.
   Cada paso tiene un instante `at` (segundos desde el inicio), una instrucción
   `note` y, opcionalmente, `waterFrac` = fracción ACUMULADA del agua total que
   debe haberse vertido al ejecutar el paso. Los gramos absolutos se derivan
   escalando esa fracción al agua total real de la extracción (dosis × ratio),
   de modo que la guía se ajusta sola a cualquier dosis. */

import type { MethodKey } from "./method";

export type PourStep = { at: number; waterFrac?: number; note: string };

export const METHOD_STEPS: Record<MethodKey, PourStep[]> = {
  v60: [
    { at: 0, waterFrac: 0.15, note: "Bloom — moja todo el café y espera" },
    { at: 45, waterFrac: 0.6, note: "1.er vertido (espiral del centro hacia afuera)" },
    { at: 75, waterFrac: 1.0, note: "2.º vertido hasta el total" },
    { at: 105, note: "Drawdown — deja drenar" },
    { at: 150, note: "Listo (~2:30)" },
  ],
  espresso: [
    { at: 0, waterFrac: 0.15, note: "Preinfusión — baja presión" },
    { at: 8, waterFrac: 1.0, note: "Extracción a presión plena" },
    { at: 28, note: "Corta al alcanzar el rendimiento objetivo" },
  ],
  moka: [
    { at: 0, waterFrac: 1.0, note: "Agua caliente al depósito; fuego medio" },
    { at: 150, note: "Primer flujo de café" },
    { at: 240, note: "Retira del fuego al primer gorgoteo; enfría la base" },
  ],
  aeropress: [
    { at: 0, waterFrac: 1.0, note: "Agrega toda el agua y remueve 3 veces" },
    { at: 15, note: "Coloca filtro y tapa; reposo" },
    { at: 75, note: "Voltea sobre la taza (si es invertida)" },
    { at: 90, note: "Presiona lento (~20 s)" },
  ],
  french_press: [
    { at: 0, waterFrac: 1.0, note: "Agrega toda el agua y satura el café" },
    { at: 30, note: "Rompe la costra y remueve" },
    { at: 240, note: "Retira la espuma; coloca el émbolo sin presionar" },
    { at: 270, note: "Presiona despacio y sirve" },
  ],
  cold_brew: [
    { at: 0, waterFrac: 1.0, note: "Combina café y agua; remueve bien" },
    { at: 12 * 3600, note: "Reposa 12–18 h (en nevera)" },
    { at: 16 * 3600, note: "Filtra y refrigera" },
  ],
  cold_drip: [
    { at: 0, waterFrac: 1.0, note: "Carga el agua; ajusta el goteo (~1 gota/s)" },
    { at: 3 * 3600, note: "Goteo total ~3–4 h" },
    { at: 15 * 3600, note: "Reposa ~12 h antes de servir" },
  ],
};

export type DisplayStep = { time: string; note: string; waterTo: number | null };

/** Formatea segundos como mm:ss, o como horas cuando el paso dura horas. */
export function fmtClock(sec: number): string {
  if (sec >= 3600) {
    const h = sec / 3600;
    return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Parsea lo que escribe el usuario en el campo de tiempo a segundos.
   Acepta "m:ss", "h:mm:ss", segundos sueltos ("90") y horas ("3h", "1.5 h"). */
export function parseClock(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("h")) {
    const h = parseFloat(s.replace("h", "").trim());
    return Number.isFinite(h) ? Math.round(h * 3600) : null;
  }
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Pasos listos para mostrar, con el agua acumulada escalada al total real. */
export function buildSteps(methodKey: MethodKey, totalWaterG: number): DisplayStep[] {
  const steps = METHOD_STEPS[methodKey] ?? [];
  return steps.map((p) => ({
    time: fmtClock(p.at),
    note: p.note,
    waterTo: p.waterFrac != null && totalWaterG > 0 ? Math.round(p.waterFrac * totalWaterG) : null,
  }));
}
