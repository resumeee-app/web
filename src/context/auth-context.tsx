import * as React from "react";
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
 * Pluggable authentication vendor adapter injected into {@link AuthProvider}.
 */
export interface AuthAdapter {
  /**
   * Subscribes to identity and bearer-token changes from an external auth vendor.
   */
  subscribe?: (
    onAuthStateChange: (user: AuthUser | null, token: string | null) => void
  ) => () => void;
  /**
   * Signs out of the external auth vendor session.
   */
  signOut?: () => Promise<void>;
  /**
   * Optional login UI widget rendered inside {@link LoginPage} when multi-tenant mode is active.
   */
  LoginWidget?: React.ComponentType;
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
  loginWidget?: React.ComponentType;
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
  loginWidget: undefined,
};

/**
 * Props for AuthProvider.
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Optional authentication vendor adapter for multi-tenant deployments.
   */
  authAdapter?: AuthAdapter;
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
  authAdapter,
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

    if (initialUser !== undefined || !authAdapter?.subscribe) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = authAdapter.subscribe((nextUser, token) => {
        setAuthToken(token);
        setUser(nextUser);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, [admin, authAdapter, initialUser]);

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
    if (!admin && authAdapter?.signOut) {
      try {
        await authAdapter.signOut();
      } catch {
        // Safe fallback
      }
    }
    setAuthToken(null);
    setUser(null);
  }, [admin, authAdapter]);

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
      loginWidget: authAdapter?.LoginWidget,
    }),
    [user, loading, admin, signOut, quotaExceededWarning, dismissQuotaWarning, authAdapter]
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
