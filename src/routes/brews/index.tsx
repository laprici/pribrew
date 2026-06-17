import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BrewCard } from "@/components/BrewCard";
import { Card, ScreenHeader } from "@/components/ui";
import { useBrews } from "@/data/brews";

export const Route = createFileRoute("/brews/")({
  component: BrewsPage,
});

function BrewsPage() {
  const { data: brews = [], isLoading } = useBrews();

  return (
    <AppShell title="Recetas">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader
          sub="Historial"
          title="Extracciones"
          right={
            <Link to="/brews/new" className="btn-primary">
              <Plus size={16} /> Nueva
            </Link>
          }
        />
        {isLoading ? (
          <Card className="text-center text-sm text-muted">Cargando…</Card>
        ) : brews.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            Aún no hay extracciones registradas.
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
