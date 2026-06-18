import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BrewCard } from "@/components/BrewCard";
import { Card, ScreenHeader } from "@/components/ui";
import { Select } from "@/components/form";
import { useBrews } from "@/data/brews";
import { useRecetas } from "@/data/recetas";
import { useMethods } from "@/data/methods";
import { useBeans } from "@/data/beans";
import { useGrinders } from "@/data/grinders";

const searchSchema = z.object({
  receta: z.string().uuid().optional(),
  method: z.string().uuid().optional(),
  bean: z.string().uuid().optional(),
  grinder: z.string().uuid().optional(),
});
type BrewsSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/brews/")({
  validateSearch: searchSchema,
  component: BrewsPage,
});

function BrewsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/brews/" });
  const { data: brews = [], isLoading } = useBrews({
    recetaId: search.receta,
    methodId: search.method,
    beanId: search.bean,
    grinderId: search.grinder,
  });
  const { data: recetas = [] } = useRecetas();
  const { data: methods = [] } = useMethods();
  const { data: beans = [] } = useBeans();
  const { data: grinders = [] } = useGrinders();

  const setFilter = (patch: Partial<BrewsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const hasFilters = !!(search.receta || search.method || search.bean || search.grinder);

  return (
    <AppShell title="Historial">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader sub="Extracciones" title="Historial" />

        {/* filtros */}
        <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={search.receta ?? ""}
            onChange={(v) => setFilter({ receta: v || undefined })}
            placeholder="Receta"
            options={recetas.map((r) => ({ value: r.id, label: r.name }))}
          />
          <Select
            value={search.method ?? ""}
            onChange={(v) => setFilter({ method: v || undefined })}
            placeholder="Método"
            options={methods.map((m) => ({ value: m.id, label: m.name }))}
          />
          <Select
            value={search.bean ?? ""}
            onChange={(v) => setFilter({ bean: v || undefined })}
            placeholder="Grano"
            options={beans.map((b) => ({ value: b.id, label: b.origin }))}
          />
          <Select
            value={search.grinder ?? ""}
            onChange={(v) => setFilter({ grinder: v || undefined })}
            placeholder="Moledor"
            options={grinders.map((g) => ({ value: g.id, label: g.name }))}
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => navigate({ search: {} })}
            className="mono mb-3 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-accent"
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : brews.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            {hasFilters
              ? "Sin extracciones que coincidan con los filtros."
              : "Aún no hay extracciones registradas."}
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
