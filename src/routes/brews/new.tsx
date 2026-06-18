import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BrewForm } from "@/components/forms/BrewForm";

// Permite pre-sembrar el form al «Repetir» una extracción.
const searchSchema = z.object({
  receta: z.string().uuid().optional(),
  bean: z.string().uuid().optional(),
  grinder: z.string().uuid().optional(),
  dose: z.string().optional(),
});

export const Route = createFileRoute("/brews/new")({
  validateSearch: searchSchema,
  component: NewBrew,
});

function NewBrew() {
  const { receta, bean, grinder, dose } = Route.useSearch();
  return (
    <BrewForm initial={{ recetaId: receta, beanId: bean, grinderId: grinder, dose }} />
  );
}
