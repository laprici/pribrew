import { createFileRoute } from "@tanstack/react-router";
import { BrewForm } from "@/components/forms/BrewForm";

export const Route = createFileRoute("/brews/new")({
  component: () => <BrewForm />,
});
