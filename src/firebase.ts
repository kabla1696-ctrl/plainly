// Plainly — Firebase services: App Check, anonymous Auth, Remote Config.
// Kept separate from ai.ts so the UI can show service status independently.

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  type RemoteConfig,
} from "firebase/remote-config";
import {
  appCheckSiteKey,
  firebaseConfig,
  isFirebaseConfigured,
} from "./firebase-config";
import { DEFAULTS } from "./config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rc: RemoteConfig | null = null;

export interface ServiceStatus {
  configured: boolean;
  appCheck: string;
  auth: string;
  remoteConfig: string;
}

export function getApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Initialize App Check, anonymous sign-in and Remote Config. Safe to call
 *  once at startup; every step is individually guarded so one failure does
 *  not take the whole app down. Returns a status summary for the UI. */
export async function initServices(): Promise<ServiceStatus> {
  const status: ServiceStatus = {
    configured: isFirebaseConfigured,
    appCheck: "not configured",
    auth: "not configured",
    remoteConfig: "not configured",
  };
  if (!isFirebaseConfigured) return status;

  const firebaseApp = getApp();

  // App Check: debug provider for local dev (a debug token is printed to the
  // console on first run — safelist it in the console), reCAPTCHA Enterprise
  // in production once a site key exists.
  try {
    if (appCheckSiteKey) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      status.appCheck = "reCAPTCHA Enterprise";
    } else {
      // Debug provider for local development: setting the flag makes the SDK
      // take the debug-token path (verified in @firebase/app-check source —
      // the provider below is never called while debug mode is on). The SDK
      // prints the debug token to the console on first run; safelist it in
      // the Firebase console under App Check > Apps > Manage debug tokens.
      (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
        true;
      initializeAppCheck(firebaseApp, {
        provider: new CustomProvider({
          getToken: () =>
            Promise.reject(
              new Error(
                "No App Check provider configured — set a reCAPTCHA Enterprise site key for production.",
              ),
            ),
        }),
        isTokenAutoRefreshEnabled: true,
      });
      status.appCheck = "debug provider (local dev)";
    }
  } catch (e) {
    status.appCheck = `error: ${(e as Error).message}`;
  }

  try {
    auth = getAuth(firebaseApp);
    await signInAnonymously(auth);
    status.auth = "anonymous";
  } catch (e) {
    status.auth = `error: ${(e as Error).message}`;
  }

  try {
    rc = getRemoteConfig(firebaseApp);
    rc.settings.minimumFetchIntervalMillis = 60_000;
    rc.defaultConfig = {
      on_device_max_chars: String(DEFAULTS.onDeviceMaxChars),
      default_mode: DEFAULTS.defaultMode,
      cloud_model: DEFAULTS.cloudModel,
    };
    await fetchAndActivate(rc);
    status.remoteConfig = "live";
  } catch {
    status.remoteConfig = "defaults (offline)";
  }

  return status;
}

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (!db) db = getFirestore(getApp());
  return db;
}

export function getAuthUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

export function getRemoteValue(key: string, fallback: string): string {
  try {
    if (!rc) return fallback;
    const v = getValue(rc, key).asString();
    return v || fallback;
  } catch {
    return fallback;
  }
}
