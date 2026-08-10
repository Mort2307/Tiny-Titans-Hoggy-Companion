import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

const auth = getAuth(app);

const db = getFirestore(app);

export {
  app,
  auth,
  db,
};

export default app;