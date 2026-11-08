import React from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, type AuthUser } from "@/context/auth-context";
import { router as defaultRouter, type createAppRouter } from "./router";

/**
 * Creates a fresh, isolated QueryClient instance with production defaults.
 *
 * @returns Configured TanStack QueryClient instance.
 */
export function createDefaultQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Props accepted by the root {@link App} component.
 */
export interface AppProps {
  /**
   * Optional custom QueryClient for dependency injection during unit and integration tests.
   */
  queryClient?: QueryClient;
  /**
   * Optional custom router instance (e.g. MemoryRouter) for testing specific route entries.
   */
  router?: ReturnType<typeof createAppRouter>;
  /**
   * Optional initial user for multi-tenant testing scenarios.
   */
  initialUser?: AuthUser | null;
  /**
   * Optional initial admin mode override for testing scenarios.
   */
  initialAdminMode?: boolean;
}

/**
 * Root Application entrypoint component composing top-level providers.
 *
 * @remarks
 * Composes {@link ThemeProvider}, {@link QueryClientProvider}, {@link TooltipProvider},
 * and the {@link RouterProvider}.
 *
 * @param props - Component props as defined by {@link AppProps}.
 * @returns Root application JSX tree.
 */
export const App: React.FC<AppProps> = ({
  queryClient: propQueryClient,
  router: propRouter,
  initialUser,
  initialAdminMode,
}) => {
  const [queryClient] = React.useState(
    () => propQueryClient || createDefaultQueryClient()
  );
  const activeRouter = propRouter || defaultRouter;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={initialUser} initialAdminMode={initialAdminMode}>
          <TooltipProvider>
            <RouterProvider router={activeRouter} />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
