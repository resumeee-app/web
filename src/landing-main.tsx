import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/lib/theme-provider";
import { LandingLayout } from "@/components/layout/landing-layout";
import { LandingPage } from "@/pages/landing-page";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element in landing.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <LandingLayout>
        <LandingPage />
      </LandingLayout>
    </ThemeProvider>
  </React.StrictMode>
);
