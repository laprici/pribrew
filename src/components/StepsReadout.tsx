import type { BrewStep } from "@/domain/receta.schema";
import { fmtClock } from "@/domain/methodSteps";

/* Lista de pasos en modo lectura (tiempo · instrucción · agua acumulada).
   Compartida por el detalle de extracción y la vista previa del form. */
export function StepsReadout({ steps }: { steps: BrewStep[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-baseline gap-3">
          <span className="mono w-12 flex-none text-[13px] font-medium text-accent">{fmtClock(s.at)}</span>
          <span className="flex-1 text-[13.5px] leading-snug text-ink-soft">{s.note || "—"}</span>
          {s.water_to != null && (
            <span className="mono flex-none text-[12px] text-muted">→ {s.water_to} g</span>
          )}
        </li>
      ))}
    </ol>
  );
}
