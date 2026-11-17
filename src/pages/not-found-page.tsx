import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Page Not Found
      </h1>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 max-w-sm">
        The requested page could not be located in this SPA routing context.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};
