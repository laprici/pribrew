import { createFileRoute } from "@tanstack/react-router";
import { BeanForm } from "@/components/forms/BeanForm";

export const Route = createFileRoute("/beans/$beanId/edit")({
  component: EditBean,
});

function EditBean() {
  const { beanId } = Route.useParams();
  return <BeanForm beanId={beanId} />;
}
