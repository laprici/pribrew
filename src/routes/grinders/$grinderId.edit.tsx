import { createFileRoute } from "@tanstack/react-router";
import { GrinderForm } from "@/components/forms/GrinderForm";

export const Route = createFileRoute("/grinders/$grinderId/edit")({
  component: EditGrinder,
});

function EditGrinder() {
  const { grinderId } = Route.useParams();
  return <GrinderForm grinderId={grinderId} />;
}
