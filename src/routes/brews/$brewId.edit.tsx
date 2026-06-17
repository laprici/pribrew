import { createFileRoute } from "@tanstack/react-router";
import { BrewForm } from "@/components/forms/BrewForm";

export const Route = createFileRoute("/brews/$brewId/edit")({
  component: EditBrew,
});

function EditBrew() {
  const { brewId } = Route.useParams();
  return <BrewForm brewId={brewId} />;
}
