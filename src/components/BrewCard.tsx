import { Link } from "@tanstack/react-router";
import type { BrewVM } from "@/domain/view";
import { Card, MethodBadge, ScoreRing, fmtRatio, fmtTime, fmtDate } from "@/components/ui";

function MiniCell({
  k,
  v,
  unit,
  accent,
  border,
}: {
  k: string;
  v: string;
  unit?: string;
  accent?: boolean;
  border?: boolean;
}) {
  return (
    <div className={`px-3.5 py-2.5 ${border ? "border-l border-hairline" : ""}`}>
      <span className="tag text-[9px]">{k}</span>
      <div className={`mono mt-0.5 text-base font-medium ${accent ? "text-accent" : "text-ink"}`}>
        {v}
        {unit && <span className="ml-px text-[0.62em] text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function BrewCard({ brew }: { brew: BrewVM }) {
  const bean = brew.bean;
  const ratio = fmtRatio(brew.dose, brew.water);
  return (
    <Link to="/brews/$brewId" params={{ brewId: brew.id }} className="block">
      <Card pad={false} className="overflow-hidden hover:border-hairline-strong">
        <div className="flex gap-3.5 px-4 pb-3.5 pt-4">
          <div
            className="w-1 flex-none self-stretch rounded"
            style={{ background: bean?.color ?? "var(--hairline-strong)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <MethodBadge method={brew.method} />
              <span className="tag text-faint">{fmtDate(brew.date)}</span>
            </div>
            <div className="mb-0.5 truncate text-lg font-semibold leading-tight tracking-[-0.02em]">
              {brew.recetaName ?? brew.method}
            </div>
            <div className="tag text-muted">
              {bean ? `${bean.origin} · ${bean.variety}` : "Sin grano"}
            </div>
          </div>
          <ScoreRing score={brew.score} />
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] border-t border-hairline">
          <MiniCell k="Ratio" v={ratio} accent />
          <MiniCell k="Dosis" v={brew.dose.toFixed(1)} unit="g" border />
          <MiniCell k="Temp" v={String(brew.temp)} unit="°" border />
          <MiniCell k="Tiempo" v={fmtTime(brew.timeSec)} border />
        </div>
      </Card>
    </Link>
  );
}
