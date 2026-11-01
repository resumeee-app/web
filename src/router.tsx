import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";
import { RootLayout } from "./components/layout/root-layout";
import { HomePage } from "./pages/home-page";
import { NotFoundPage } from "./pages/not-found-page";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];

/**
 * Creates a browser or memory router instance.
 * Passing initialEntries creates an isolated memory router for testing.
 */
export function createAppRouter(initialEntries?: string[]) {
  if (initialEntries && initialEntries.length > 0) {
    return createMemoryRouter(routes, { initialEntries });
  }
  return createBrowserRouter(routes);
}

export const router = createAppRouter();
