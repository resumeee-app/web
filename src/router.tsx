import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";
import { RootLayout } from "./components/layout/root-layout";
import { HomePage } from "./pages/home-page";
import { BranchesPage } from "./pages/branches-page";
import { BranchWorkbenchPage } from "./pages/branch-workbench-page";
import { ResumePreviewPage } from "./pages/resume-preview-page";
import { TemplatesPage } from "./pages/templates-page";
import { TemplateEditorPage } from "./pages/template-editor-page";
import { PresetsPage } from "./pages/presets-page";
import { PresetEditorPage } from "./pages/preset-editor-page";
import { NotFoundPage } from "./pages/not-found-page";
import { ProfilePage } from "./pages/profile-page";

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
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "branches",
        element: <BranchesPage />,
      },
      {
        path: "branches/:id",
        element: <BranchWorkbenchPage />,
      },
      {
        path: "branches/:id/preview",
        element: <ResumePreviewPage />,
      },
      {
        path: "templates",
        element: <TemplatesPage />,
      },
      {
        path: "templates/:id",
        element: <TemplateEditorPage />,
      },
      {
        path: "presets",
        element: <PresetsPage />,
      },
      {
        path: "presets/new",
        element: <PresetEditorPage />,
      },
      {
        path: "presets/:id",
        element: <PresetEditorPage />,
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
