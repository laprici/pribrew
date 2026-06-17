import { createFileRoute } from "@tanstack/react-router";
import { BeanForm } from "@/components/forms/BeanForm";

export const Route = createFileRoute("/beans/new")({
  component: () => <BeanForm />,
});
