import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles.css";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Clear cached queries on sign-out. Sign-in navigates to "/" from the auth
// page, which naturally triggers the loaders — invalidating the router here
// races with that navigation and can crash <MatchInnerImpl> during commit.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    queryClient.clear();
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element missing from index.html");

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  </StrictMode>,
);
