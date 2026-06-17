import { createFileRoute } from "@tanstack/react-router";
import { GrinderForm } from "@/components/forms/GrinderForm";

export const Route = createFileRoute("/grinders/new")({
  component: () => <GrinderForm />,
});
