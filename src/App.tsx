import React from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { router as defaultRouter, type createAppRouter } from "./router";

/**
 * Creates a fresh, isolated QueryClient instance with production defaults.
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

export interface AppProps {
  queryClient?: QueryClient;
  router?: ReturnType<typeof createAppRouter>;
}

export const App: React.FC<AppProps> = ({
  queryClient: propQueryClient,
  router: propRouter,
}) => {
  const [queryClient] = React.useState(
    () => propQueryClient || createDefaultQueryClient()
  );
  const activeRouter = propRouter || defaultRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={activeRouter} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
