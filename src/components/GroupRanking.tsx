import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Card, Readout, ScoreRing, fmtRatio, fmtTime } from "@/components/ui";
import { Author } from "@/components/Author";
import { useBrews } from "@/data/brews";
import type { BrewVM } from "@/domain/view";

/** Mejor extracción + ranking del grupo para una receta.
   Reutiliza useBrews({recetaId}), que ya trae TODAS las extracciones del grupo
   (propias y compartidas por RLS) ligadas a esta plantilla. Ordena por score. */
export function GroupRanking({ recetaId }: { recetaId: string }) {
  const { data: brews = [], isLoading } = useBrews({ recetaId });

  if (isLoading) return null;

  if (brews.length === 0) {
    return (
      <Card className="mb-3.5 text-center text-sm text-muted">
        Aún nadie ha registrado extracciones de esta receta. Pulsa “Preparar” para ser el primero.
      </Card>
    );
  }

  // score desc, desempate por fecha más reciente.
  const ranked = [...brews].sort(
    (a, b) => b.score - a.score || (a.date < b.date ? 1 : -1)
  );
  const [best, ...rest] = ranked;

  return (
    <>
      {/* mejor extracción del grupo */}
      <Card className="relative mb-3 overflow-hidden bg-surface-2">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 85% 0%, var(--glow), transparent 60%)" }}
        />
        <div className="relative mb-3 flex items-center gap-2">
          <span className="tag inline-flex items-center gap-1.5 text-accent">
            <Trophy size={13} /> Mejor extracción del grupo
          </span>
          <span className="ml-auto">
            <Author ownerId={best.ownerId} />
          </span>
        </div>
        <Link to="/brews/$brewId" params={{ brewId: best.id }} className="relative block">
          <div className="flex items-end gap-4">
            <Readout k="Ratio" v={fmtRatio(best.dose, best.water)} big accent />
            <div className="flex-1" />
            <ScoreRing score={best.score} />
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-3 border-t border-hairline pt-3.5">
            <Readout k="Molienda" v={best.grind} />
            <Readout k="Dosis" v={best.dose.toFixed(1)} unit="g" />
            <Readout k="Temp" v={String(best.temp)} unit="°C" />
            <Readout k="Tiempo" v={fmtTime(best.timeSec)} />
          </div>
        </Link>
      </Card>

      {/* ranking del resto (top 5) */}
      {rest.length > 0 && (
        <Card pad={false} className="mb-3.5">
          <div className="tag px-4 pb-2.5 pt-3.5">Otros intentos</div>
          <div className="flex flex-col">
            {rest.slice(0, 5).map((b: BrewVM, i: number) => (
              <Link
                key={b.id}
                to="/brews/$brewId"
                params={{ brewId: b.id }}
                className="flex items-center gap-3 border-t border-hairline px-4 py-3 transition-colors hover:bg-chip"
              >
                <span className="mono w-5 flex-none text-center text-sm text-faint">
                  {i + 2}
                </span>
                <span className="mono flex-none text-base font-medium text-accent">
                  {fmtRatio(b.dose, b.water)}
                </span>
                <span className="tag flex-1 truncate text-muted">Molienda {b.grind}</span>
                <Author ownerId={b.ownerId} />
                <span className="mono text-sm font-medium text-ink">{b.score.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
