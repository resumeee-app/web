import * as React from "react";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { setAuthToken, isAdminMode } from "@/api/client";

/**
 * Basic user identity representation.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Public authentication context interface.
 */
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  adminMode: boolean;
  signOut: () => Promise<void>;
  quotaExceededWarning: boolean;
  dismissQuotaWarning: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/**
 * Default fallback state when AuthProvider is not in tree (e.g. isolated component unit tests).
 */
const DEFAULT_AUTH_STATE: AuthContextType = {
  user: {
    uid: "default",
    email: "admin@resumeee.local",
    displayName: "Admin User",
  },
  loading: false,
  adminMode: true,
  signOut: async () => {},
  quotaExceededWarning: false,
  dismissQuotaWarning: () => {},
};

/**
 * Props for AuthProvider.
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Optional mock user for testing scenarios.
   */
  initialUser?: AuthUser | null;
  /**
   * Optional mock admin mode override for testing scenarios.
   */
  initialAdminMode?: boolean;
}

/**
 * Provides application-wide authentication state and lifecycle event listeners.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialUser,
  initialAdminMode,
}) => {
  const admin = initialAdminMode !== undefined ? initialAdminMode : isAdminMode();
  const [user, setUser] = React.useState<AuthUser | null>(() => {
    if (initialUser !== undefined) {
      return initialUser;
    }
    if (admin) {
      return {
        uid: "default",
        email: "admin@resumeee.local",
        displayName: "Admin User",
      };
    }
    return null;
  });
  const [loading, setLoading] = React.useState<boolean>(initialUser === undefined && !admin);
  const [quotaExceededWarning, setQuotaExceededWarning] = React.useState(false);

  React.useEffect(() => {
    if (admin) {
      setUser({
        uid: "default",
        email: "admin@resumeee.local",
        displayName: "Admin User",
      });
      setLoading(false);
      return;
    }

    if (initialUser !== undefined || !isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            setAuthToken(token);
          } catch {
            setAuthToken(null);
          }
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
          });
        } else {
          setAuthToken(null);
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, [admin, initialUser]);

  React.useEffect(() => {
    const handleUnauthorized = () => {
      if (!admin) {
        setAuthToken(null);
        setUser(null);
      }
    };

    const handleQuotaExceeded = () => {
      setQuotaExceededWarning(true);
    };

    window.addEventListener("resumeee:unauthorized", handleUnauthorized);
    window.addEventListener("resumeee:quota-exceeded", handleQuotaExceeded);

    return () => {
      window.removeEventListener("resumeee:unauthorized", handleUnauthorized);
      window.removeEventListener("resumeee:quota-exceeded", handleQuotaExceeded);
    };
  }, [admin]);

  const signOut = React.useCallback(async () => {
    if (!admin && isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        await firebaseSignOut(auth);
      } catch {
        // Safe fallback
      }
    }
    setAuthToken(null);
    setUser(null);
  }, [admin]);

  const dismissQuotaWarning = React.useCallback(() => {
    setQuotaExceededWarning(false);
  }, []);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      adminMode: admin,
      signOut,
      quotaExceededWarning,
      dismissQuotaWarning,
    }),
    [user, loading, admin, signOut, quotaExceededWarning, dismissQuotaWarning]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Access the active authentication context. Falls back to safe default if unmounted.
 */
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  return context || DEFAULT_AUTH_STATE;
}
