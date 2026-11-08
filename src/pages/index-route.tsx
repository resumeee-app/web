import React from "react";
import { useAuth } from "@/context/auth-context";
import { HomePage } from "./home-page";
import { LandingPage } from "./landing-page";

/**
 * Root index route component dynamically serving either the public Landing Page
 * (for unauthenticated visitors in multi-tenant mode) or the primary Dashboard
 * (for authenticated users and single-user admin mode).
 *
 * @returns JSX Element rendering either {@link LandingPage} or {@link HomePage}.
 */
export const IndexRoute: React.FC = () => {
  const { user, adminMode } = useAuth();

  if (!adminMode && !user) {
    return <LandingPage />;
  }

  return <HomePage />;
};

export default IndexRoute;
