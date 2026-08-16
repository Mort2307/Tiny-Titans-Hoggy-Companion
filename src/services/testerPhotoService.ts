import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { saveSnakeShed } from "./shedService";
import type { TesterCheck } from "./testerBotService";
import type { Snake } from "../types/Snake";
import type { ShedRecord } from "../types/Shed";

function testId(): string {
  return `__tester_shed_photo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function createTinyJpeg(): Promise<File> {
  if (typeof document === "undefined") throw new Error("Shed photo testing requires a browser runtime.");
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser canvas is unavailable for the Shed photo test.");
  context.fillStyle = "#111111";
  context.fillRect(0, 0, 8, 8);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to create the test JPEG.")), "image/jpeg", 0.8));
  return new File([blob], "tiny-titans-tester.jpg", { type: "image/jpeg" });
}

export function createShedPhotoRegressionCheck(uid: string, snake?: Snake): TesterCheck {
  return {
    id: "shed-photo-storage-persistence",
    name: "Shed photo Storage upload, Firestore metadata and cleanup",
    category: "shed",
    severity: "critical",
    descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore",
    run: async () => {
      if (!snake) return { status: "blocked", message: "No snake is available for an isolated Shed photo test.", details: { expected: "At least one snake profile", actual: "No snake profiles available", descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore" } };
      const shedId = testId();
      const path = `users/${uid}/snakes/${snake.id}/sheds/${shedId}`;
      let storagePath = "";
      const base: ShedRecord = {
        id: shedId,
        snakeId: snake.id,
        date: "2099-01-03",
        bluePhaseStarted: true,
        eyesSkinCleared: true,
        shedCompleted: true,
        retainedShedArea: "None",
        retainedAreas: [],
        retainedEyeCaps: false,
        retainedTailTip: false,
        status: "Complete",
        quality: "Good",
        assistance: "None",
        notes: "Tiny Titans automated Shed photo test",
        photos: [],
      };
      try {
        const photo = await createTinyJpeg();
        const created = await saveSnakeShed(uid, base, [photo]);
        const storedPhoto = created.photos?.[0];
        if (!storedPhoto) return { status: "fail", message: "Shed save completed but no canonical photo metadata was returned.", details: { expected: "One ShedPhoto with URL and storagePath", actual: "No photo metadata", path, descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore", fixHint: "Inspect Shed photo upload, getDownloadURL and Firestore metadata persistence." } };
        storagePath = storedPhoto.storagePath;
        await getDownloadURL(ref(storage, storagePath));
        const reloaded = await getDoc(doc(db, "users", uid, "snakes", snake.id, "sheds", shedId));
        const reloadedPhoto = (reloaded.data() as Partial<ShedRecord> | undefined)?.photos?.[0];
        if (!reloaded.exists() || !reloadedPhoto?.url || reloadedPhoto.storagePath !== storagePath) return { status: "fail", message: "Shed photo Storage upload succeeded but Firebase reload did not contain matching photo metadata.", details: { expected: "Firestore photo metadata matches uploaded Storage object", actual: reloaded.exists() ? reloaded.data() : "Shed document missing", path, storagePath, descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore", fixHint: "Inspect saveSnakeShed photo metadata persistence and canonical reload." } };

        const removed = await saveSnakeShed(uid, { ...created, photos: [] }, [], [storagePath]);
        if ((removed.photos ?? []).length !== 0) return { status: "fail", message: "Removing a Shed photo did not remove its metadata from the canonical record.", details: { expected: "Zero photos after removal", actual: removed.photos?.length ?? 0, path, storagePath, descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore", fixHint: "Inspect removedPhotoPaths handling in shedService." } };
        let storageStillExists = true;
        try { await getDownloadURL(ref(storage, storagePath)); } catch { storageStillExists = false; }
        if (storageStillExists) return { status: "fail", message: "Removed Shed photo metadata was deleted but the Firebase Storage object still exists.", details: { expected: "Storage object deleted", actual: "Storage object still accessible", path, storagePath, descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore", fixHint: "Inspect deleteObject cleanup for removed Shed photo storage paths." } };
        return { status: "pass", message: "Shed photo upload → Storage URL → Firestore metadata → reload → remove metadata → Storage cleanup completed successfully.", details: { path, storagePath, descriptor: "Shed Tracker / Photos / Firebase Storage + Firestore" } };
      } finally {
        try { await deleteDoc(doc(db, "users", uid, "snakes", snake.id, "sheds", shedId)); } catch { /* best effort cleanup */ }
      }
    },
  };
}
