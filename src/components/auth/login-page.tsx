import * as React from "react";
import * as firebaseui from "firebaseui";
import "firebaseui/dist/firebaseui.css";
import { GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { ShieldAlert } from "lucide-react";
import { ResumeeeLogo } from "@/components/layout/resumeee-logo";

/**
 * Drop-in authentication screen rendering the official FirebaseUI Web SDK login widget.
 */
export const LoginPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const configured = isFirebaseConfigured();

  React.useEffect(() => {
    if (!configured || !containerRef.current) {
      return;
    }

    let ui: firebaseui.auth.AuthUI | null = null;
    try {
      const auth = getFirebaseAuth();
      ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

      ui.start(containerRef.current, {
        signInOptions: [
          GoogleAuthProvider.PROVIDER_ID,
          EmailAuthProvider.PROVIDER_ID,
        ],
        signInFlow: "popup",
        credentialHelper: firebaseui.auth.CredentialHelper.NONE,
        callbacks: {
          signInSuccessWithAuthResult: () => {
            // Return false to prevent automatic navigation, allowing AuthContext to update state
            return false;
          },
        },
      });
    } catch {
      // In non-browser/test environments, gracefully handle AuthUI initialization
    }

    return () => {
      try {
        if (ui) {
          ui.reset();
        }
      } catch {
        // Safe cleanup
      }
    };
  }, [configured]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <ResumeeeLogo className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sign in to Resumeee
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Multi-tenant resume tailoring powered by Firebase Authentication
          </p>
        </div>

        {!configured ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">Firebase Authentication Not Configured</p>
                <p className="mt-1 text-xs">
                  Please configure <code className="font-mono font-semibold">FIREBASE_PROJECT_ID</code> and{" "}
                  <code className="font-mono font-semibold">FIREBASE_API_KEY</code> in your environment, or run with{" "}
                  <code className="font-mono font-semibold">ADMIN_MODE=true</code> for local single-user mode.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            id="firebaseui-auth-container"
            ref={containerRef}
            role="region"
            aria-label="Firebase Authentication Widget"
            className="min-h-[160px]"
          />
        )}
      </div>
    </div>
  );
};

export default LoginPage;
