import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Bean as BeanIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, ScreenHeader } from "@/components/ui";
import { useGrinders } from "@/data/grinders";

export const Route = createFileRoute("/grinders/")({
  component: GrindersPage,
});

function GrindersPage() {
  const { data: grinders = [], isLoading } = useGrinders();
  const navigate = useNavigate();

  return (
    <AppShell title="Moledores">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader
          sub="Inventario"
          title="Moledores"
          right={
            <Link to="/grinders/new" className="btn-primary">
              <Plus size={17} /> Agregar
            </Link>
          }
        />

        <Link
          to="/beans"
          className="mb-3 flex items-center gap-2 text-[12px] font-medium text-ink-soft transition-colors hover:text-accent"
        >
          <BeanIcon size={14} /> Ver granos →
        </Link>

        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : grinders.length === 0 ? (
          <Card className="text-center text-sm text-muted">Aún no hay moledores en el inventario.</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {grinders.map((g) => {
              const range =
                g.min_setting != null && g.max_setting != null
                  ? `${g.min_setting}–${g.max_setting}${g.unit_label ? " " + g.unit_label : ""}`
                  : g.unit_label || "—";
              return (
                <Card
                  key={g.id}
                  onClick={() => navigate({ to: "/grinders/$grinderId/edit", params: { grinderId: g.id } })}
                  className="flex items-center gap-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-semibold tracking-[-0.02em]">{g.name}</div>
                    <div className="tag mt-1">
                      {g.type === "manual" ? "Manual" : "Eléctrico"}
                      {g.brand ? ` · ${g.brand}` : ""}
                      {g.model ? ` ${g.model}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tag text-[9px]">{g.setting_kind === "stepped" ? "Por pasos" : "Continuo"}</span>
                    <span className="mono text-[13px] text-ink-soft">{range}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
