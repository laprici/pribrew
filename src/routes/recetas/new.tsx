import { createFileRoute } from "@tanstack/react-router";
import { RecetaForm } from "@/components/forms/RecetaForm";

export const Route = createFileRoute("/recetas/new")({
  component: () => <RecetaForm />,
});
