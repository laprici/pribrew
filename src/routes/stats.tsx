import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, ScreenHeader } from "@/components/ui";
import { useBrews } from "@/data/brews";
import { useAuth } from "@/lib/auth";
import { daysSince } from "@/domain/view";

export const Route = createFileRoute("/stats")({
  component: StatsScreen,
});

const round1 = (n: number) => Math.round(n * 10) / 10;

function SummaryCell({ k, v, accent, border }: { k: string; v: string | number; accent?: boolean; border?: boolean }) {
  return (
    <div className={`px-4 py-4 ${border ? "border-l border-hairline" : ""}`}>
      <div className={`mono text-[26px] font-medium leading-none ${accent ? "text-accent" : "text-ink"}`}>{v}</div>
      <div className="tag mt-1.5">{k}</div>
    </div>
  );
}

function StatsScreen() {
  const { session } = useAuth();
  // Estadísticas individuales: solo las extracciones del usuario actual, no las del grupo.
  const { data: brews = [], isLoading } = useBrews({ personaId: session?.user.id });

  const total = brews.length;
  const scored = brews.filter((b) => b.score > 0).map((b) => b.score);
  const avg = scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  const best = scored.length ? Math.max(...scored) : null;
  const weekCount = brews.filter((b) => daysSince(b.date.slice(0, 10)) <= 7).length;

  // Distribución y puntuación por método.
  const byMethod = new Map<string, { label: string; count: number; sum: number; n: number }>();
  for (const b of brews) {
    const key = b.methodKey || b.method || "—";
    const e = byMethod.get(key) ?? { label: b.method || key, count: 0, sum: 0, n: 0 };
    e.count++;
    if (b.score > 0) {
      e.sum += b.score;
      e.n++;
    }
    byMethod.set(key, e);
  }
  const methods = [...byMethod.values()].sort((a, b) => b.count - a.count);
  const maxMethod = methods.reduce((m, x) => Math.max(m, x.count), 0);

  // Granos más usados.
  const byBean = new Map<string, number>();
  for (const b of brews) {
    if (!b.bean) continue;
    byBean.set(b.bean.origin, (byBean.get(b.bean.origin) ?? 0) + 1);
  }
  const beans = [...byBean.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Actividad — últimas 6 semanas (más antigua → más reciente).
  const weeks = Array.from({ length: 6 }, () => 0);
  for (const b of brews) {
    const w = Math.floor(daysSince(b.date.slice(0, 10)) / 7);
    if (w >= 0 && w < 6) weeks[5 - w]++;
  }
  const maxWeek = weeks.reduce((m, x) => Math.max(m, x), 0);

  return (
    <AppShell title="Estadísticas">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader sub="Bitácora" title="Estadísticas" />

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : total === 0 ? (
          <Card className="text-center text-sm text-muted">
            Aún no hay extracciones que analizar. Registra la primera desde «Recetas».
          </Card>
        ) : (
          <div className="flex flex-col gap-5">
            {/* resumen */}
            <Card pad={false}>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <SummaryCell k="Tandas" v={total} />
                <SummaryCell k="Esta semana" v={weekCount} border />
                <SummaryCell k="Puntuación ø" v={avg ?? "—"} accent border />
                <SummaryCell k="Mejor" v={best ?? "—"} border />
              </div>
            </Card>

            {/* por método */}
            <div>
              <div className="tag mb-2">Por método</div>
              <Card className="flex flex-col gap-3">
                {methods.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-28 flex-none truncate text-[13.5px] font-semibold text-ink">{m.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-pill bg-chip">
                      <div
                        className="h-full rounded-pill bg-accent"
                        style={{ width: `${maxMethod ? (m.count / maxMethod) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="mono w-6 flex-none text-right text-[13px] text-ink-soft">{m.count}</span>
                    <span className="mono w-10 flex-none text-right text-[12px] text-muted">
                      {m.n ? round1(m.sum / m.n).toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
                <div className="mono flex justify-end gap-4 text-[10px] uppercase tracking-[0.1em] text-faint">
                  <span className="w-6 text-right">n</span>
                  <span className="w-10 text-right">ø</span>
                </div>
              </Card>
            </div>

            {/* actividad */}
            <div>
              <div className="tag mb-2">Actividad · últimas 6 semanas</div>
              <Card className="flex h-[140px] items-end justify-between gap-2">
                {weeks.map((n, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <span className="mono text-[11px] text-ink-soft">{n || ""}</span>
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${maxWeek ? Math.max(4, (n / maxWeek) * 90) : 4}px`,
                        background: i === 5 ? "var(--accent)" : "var(--hairline-strong)",
                      }}
                    />
                    <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">
                      {i === 5 ? "ahora" : `-${5 - i}s`}
                    </span>
                  </div>
                ))}
              </Card>
            </div>

            {/* granos */}
            {beans.length > 0 && (
              <div>
                <div className="tag mb-2">Granos más usados</div>
                <Card className="flex flex-col gap-2.5">
                  {beans.map(([origin, n]) => (
                    <div key={origin} className="flex items-center justify-between">
                      <span className="truncate text-[14px] font-semibold text-ink">{origin}</span>
                      <span className="mono text-[13px] text-muted">
                        {n} {n === 1 ? "tanda" : "tandas"}
                      </span>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
