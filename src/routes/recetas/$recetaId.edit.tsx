import { createFileRoute } from "@tanstack/react-router";
import { RecetaForm } from "@/components/forms/RecetaForm";

export const Route = createFileRoute("/recetas/$recetaId/edit")({
  component: EditReceta,
});

function EditReceta() {
  const { recetaId } = Route.useParams();
  return <RecetaForm recetaId={recetaId} />;
}
