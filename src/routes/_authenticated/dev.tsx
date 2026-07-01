import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "./index";

export const Route = createFileRoute("/_authenticated/dev")({
  head: () => ({
    meta: [
      { title: "RAG Development Workspace" },
      {
        name: "description",
        content:
          "Development workspace — test questions against a selected vector store.",
      },
    ],
  }),
  component: () => <DashboardPage mode="dev" />,
});
