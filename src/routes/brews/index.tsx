import { useMemo, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BrewCard } from "@/components/BrewCard";
import { Card, ScreenHeader } from "@/components/ui";
import { Select } from "@/components/form";
import { useAuth } from "@/lib/auth";
import { useBrews } from "@/data/brews";
import { useRecetas } from "@/data/recetas";
import { useMethods } from "@/data/methods";
import { useBeans } from "@/data/beans";
import { useGrinders } from "@/data/grinders";
import { useProfiles } from "@/data/profiles";

const searchSchema = z.object({
  receta: z.string().uuid().optional(),
  method: z.string().uuid().optional(),
  bean: z.string().uuid().optional(),
  grinder: z.string().uuid().optional(),
  persona: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
type BrewsSearch = z.infer<typeof searchSchema>;

/** Etiqueta explícita encima de cada control de filtro. */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tag text-[10px] text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const Route = createFileRoute("/brews/")({
  validateSearch: searchSchema,
  component: BrewsPage,
});

function BrewsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/brews/" });
  const { session } = useAuth();
  const { data: brews = [], isLoading } = useBrews({
    recetaId: search.receta,
    methodId: search.method,
    beanId: search.bean,
    grinderId: search.grinder,
    personaId: search.persona,
    from: search.from,
    to: search.to,
  });
  const { data: recetas = [] } = useRecetas();
  const { data: methods = [] } = useMethods();
  const { data: beans = [] } = useBeans();
  const { data: grinders = [] } = useGrinders();
  const { data: profiles } = useProfiles();

  // Personas del historial compartido: yo primero ("Tú"), luego el resto del grupo.
  const myId = session?.user.id;
  const personaOptions = useMemo(() => {
    const entries = [...(profiles ?? new Map())] as [string, string][];
    const opts = entries
      .filter(([id]) => id !== myId)
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    if (myId) opts.unshift({ value: myId, label: "Tú" });
    return opts;
  }, [profiles, myId]);

  const setFilter = (patch: Partial<BrewsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const hasFilters = !!(
    search.receta ||
    search.method ||
    search.bean ||
    search.grinder ||
    search.persona ||
    search.from ||
    search.to
  );

  return (
    <AppShell title="Historial">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader sub="Extracciones" title="Historial" />

        {/* filtros */}
        <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FilterField label="Receta">
            <Select
              value={search.receta ?? ""}
              onChange={(v) => setFilter({ receta: v || undefined })}
              placeholder="Todas"
              options={recetas.map((r) => ({ value: r.id, label: r.name }))}
            />
          </FilterField>
          <FilterField label="Método">
            <Select
              value={search.method ?? ""}
              onChange={(v) => setFilter({ method: v || undefined })}
              placeholder="Todos"
              options={methods.map((m) => ({ value: m.id, label: m.name }))}
            />
          </FilterField>
          <FilterField label="Grano">
            <Select
              value={search.bean ?? ""}
              onChange={(v) => setFilter({ bean: v || undefined })}
              placeholder="Todos"
              options={beans.map((b) => ({ value: b.id, label: b.origin }))}
            />
          </FilterField>
          <FilterField label="Moledor">
            <Select
              value={search.grinder ?? ""}
              onChange={(v) => setFilter({ grinder: v || undefined })}
              placeholder="Todos"
              options={grinders.map((g) => ({ value: g.id, label: g.name }))}
            />
          </FilterField>
        </div>

        {/* persona — historial compartido del grupo */}
        {personaOptions.length > 1 && (
          <div className="mb-3.5">
            <FilterField label="Persona">
              <Select
                value={search.persona ?? ""}
                onChange={(v) => setFilter({ persona: v || undefined })}
                placeholder="Todos"
                options={personaOptions}
              />
            </FilterField>
          </div>
        )}

        {/* rango de fechas */}
        <div className="mb-3.5 grid grid-cols-2 gap-2">
          <FilterField label="Desde">
            <label className="flex items-center rounded-md border border-hairline-strong bg-surface-2 px-3">
              <input
                type="date"
                value={search.from ?? ""}
                max={search.to || undefined}
                onChange={(e) => setFilter({ from: e.target.value || undefined })}
                className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[13px] text-ink outline-none"
              />
            </label>
          </FilterField>
          <FilterField label="Hasta">
            <label className="flex items-center rounded-md border border-hairline-strong bg-surface-2 px-3">
              <input
                type="date"
                value={search.to ?? ""}
                min={search.from || undefined}
                onChange={(e) => setFilter({ to: e.target.value || undefined })}
                className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[13px] text-ink outline-none"
              />
            </label>
          </FilterField>
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
