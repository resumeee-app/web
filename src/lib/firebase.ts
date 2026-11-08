import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase Web configuration options interface.
 */
export interface FirebaseConfigOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
}

/**
 * Resolves Firebase configuration options from environment variables.
 */
export function getFirebaseConfig(): FirebaseConfigOptions {
  const apiKey =
    (import.meta.env.FIREBASE_API_KEY as string | undefined) ||
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ||
    "";
  const projectId =
    (import.meta.env.FIREBASE_PROJECT_ID as string | undefined) ||
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ||
    "";
  const authDomain =
    (import.meta.env.FIREBASE_AUTH_DOMAIN as string | undefined) ||
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ||
    (projectId ? `${projectId}.firebaseapp.com` : "");

  return { apiKey, authDomain, projectId };
}

/**
 * Determines whether Firebase has valid, non-empty credentials configured.
 */
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
}

let cachedAuth: Auth | null = null;

/**
 * Initializes and returns the FirebaseApp singleton, reusing existing instances if available.
 */
export function getFirebaseApp(customConfig?: FirebaseConfigOptions): FirebaseApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }
  const config = customConfig || getFirebaseConfig();
  return initializeApp({
    apiKey: config.apiKey || "dummy-api-key",
    authDomain: config.authDomain || "dummy-project.firebaseapp.com",
    projectId: config.projectId || "dummy-project",
  });
}

/**
 * Returns the Firebase Auth instance.
 */
export function getFirebaseAuth(customConfig?: FirebaseConfigOptions): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = getFirebaseApp(customConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}
