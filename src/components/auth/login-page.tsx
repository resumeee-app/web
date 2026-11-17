import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { ResumeeeLogo } from "@/components/layout/resumeee-logo";
import { useAuth } from "@/context/auth-context";

/**
 * Authentication screen rendering an injected auth vendor widget or configuration guidance.
 */
export const LoginPage: React.FC = () => {
  const { loginWidget: LoginWidget } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <ResumeeeLogo className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sign in to Resumeee
          </h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Multi-tenant resume tailoring
          </p>
        </div>

        {!LoginWidget ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">Authentication Provider Not Configured</p>
                <p className="mt-1 text-xs">
                  Please inject an authentication adapter in your application configuration, or run with{" "}
                  <code className="font-mono font-semibold">ADMIN_MODE=true</code> for local single-user mode.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Authentication Widget"
            className="min-h-[160px]"
          >
            <LoginWidget />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
