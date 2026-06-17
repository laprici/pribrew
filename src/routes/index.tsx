import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BrewCard } from "@/components/BrewCard";
import { Card } from "@/components/ui";
import { useBrews } from "@/data/brews";
import { useAuth } from "@/lib/auth";
import { daysSince } from "@/domain/view";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function SummaryCell({
  k,
  v,
  accent,
  border,
}: {
  k: string;
  v: string | number;
  accent?: boolean;
  border?: boolean;
}) {
  return (
    <div className={`px-4 py-4 ${border ? "border-x border-hairline" : ""}`}>
      <div className={`mono text-[26px] font-medium leading-none ${accent ? "text-accent" : "text-ink"}`}>
        {v}
      </div>
      <div className="tag mt-1.5">{k}</div>
    </div>
  );
}

function Dashboard() {
  const { session } = useAuth();
  const { data: brews = [], isLoading } = useBrews();

  const local = session?.user?.email?.split("@")[0] ?? "barista";
  const name = local.charAt(0).toUpperCase() + local.slice(1);

  const scored = brews.filter((b) => b.score > 0).map((b) => b.score);
  const avg = scored.length
    ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1)
    : "—";
  const weekCount = brews.filter((b) => daysSince(b.date.slice(0, 10)) <= 7).length;

  return (
    <AppShell title="Bitácora">
      <div className="mx-auto max-w-2xl">
        <div className="pb-4">
          <div className="tag mb-1.5">Bitácora de extracción</div>
          <h1 className="text-[28px] font-semibold leading-none tracking-[-0.035em]">
            Buen café, {name}.
          </h1>
        </div>

        <Card pad={false} className="mb-5">
          <div className="grid grid-cols-3">
            <SummaryCell k="Tandas" v={brews.length} />
            <SummaryCell k="Esta semana" v={weekCount} border />
            <SummaryCell k="Puntuación ø" v={avg} accent />
          </div>
        </Card>

        <div className="mb-3 flex items-baseline justify-between">
          <span className="tag">Recientes</span>
          <span className="tag text-faint">{brews.length} registros</span>
        </div>

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : brews.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Aún no hay extracciones. Registra la primera desde «Recetas».
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {brews.map((b) => (
              <BrewCard key={b.id} brew={b} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
