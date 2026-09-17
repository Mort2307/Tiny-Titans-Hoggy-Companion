import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0",
  authDomain: "tinytitans-hoggy-companion.firebaseapp.com",
  projectId: "tinytitans-hoggy-companion",
  storageBucket: "tinytitans-hoggy-companion.firebasestorage.app",
  messagingSenderId: "309730999071",
  appId: "1:309730999071:web:c2b9364b584f7879900e2a",
  measurementId: "G-Z49MZXV4BR",
};

const app = initializeApp(firebaseConfig);

// Firebase AI Logic should be protected by App Check in production. The web
// site key is public and belongs in the Vite environment, never source code.
// Local development uses Firebase's debug-token mechanism instead of putting
// localhost on the production reCAPTCHA Enterprise key.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  const debugWindow = window as Window & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean };
  debugWindow.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || "").trim();
const appCheck = typeof window !== "undefined" && appCheckSiteKey
  ? initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true })
  : null;

if (typeof window !== "undefined" && import.meta.env.PROD && !appCheckSiteKey) {
  console.warn("Tiny Titans App Check is not configured. Set VITE_RECAPTCHA_ENTERPRISE_SITE_KEY before enforcing App Check or enabling production Firebase AI Logic.");
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, appCheck, auth, db, storage };
export default app;
