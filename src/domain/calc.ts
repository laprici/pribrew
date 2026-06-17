/** Ratio café:agua (yield/dose), redondeado a 1 decimal. */
export function ratio(dose_g?: number, yield_g?: number): number | null {
  if (!dose_g || !yield_g || dose_g <= 0) return null;
  return Math.round((yield_g / dose_g) * 10) / 10;
}

/** Días transcurridos desde el tueste hasta la fecha de extracción. */
export function daysOffRoast(roastDate?: string | null, brewedAt?: string | null): number | null {
  if (!roastDate) return null;
  const roast = new Date(roastDate).getTime();
  const brew = brewedAt ? new Date(brewedAt).getTime() : Date.now();
  if (Number.isNaN(roast)) return null;
  return Math.max(0, Math.floor((brew - roast) / 86_400_000));
}

/** Segundos → "m:ss". */
export function formatTime(totalSeconds?: number | null): string {
  if (totalSeconds == null) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
