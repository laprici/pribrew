import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/martian-mono";
import "./styles.css";

import { routeTree } from "./routeTree.gen";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth";
import { applyStoredTheme } from "./lib/theme";

// Fija el tema antes del primer render para evitar parpadeo.
applyStoredTheme();

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
