import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "../firebase/config";

export type MorphCreditMode = "name" | "social" | "anonymous";

export interface MorphSubmissionInput {
  morphName: string;
  description: string;
  observedTraits: string;
  proofDetails: string;
  proofReference?: string;

  photoRequirementsConfirmed: boolean;
  factualAccuracyConfirmed: boolean;

  creditMode: MorphCreditMode;
  creditName?: string;
  creditSocial?: string;

  image: File;
}

export interface MorphSubmissionResult {
  submissionId: string;
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

async function prepareImage(file: File): Promise<Blob> {
  if (!file) {
    throw new Error("Please add the primary morph photograph.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (typeof createImageBitmap === "undefined") {
    return prepareImageWithImageElement(file);
  }

  const bitmap = await createImageBitmap(file);

  try {
    const maxDimension = 1800;

    const largestDimension = Math.max(
      bitmap.width,
      bitmap.height
    );

    const scale = Math.min(
      1,
      maxDimension / largestDimension
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare the image.");
    }

    context.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvasToJpeg(canvas);
  } finally {
    bitmap.close();
  }
}

async function prepareImageWithImageElement(
  file: File
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const element = new Image();

        element.onload = () => resolve(element);

        element.onerror = () =>
          reject(
            new Error(
              "Unable to read the selected image."
            )
          );

        element.src = objectUrl;
      }
    );

    const maxDimension = 1800;

    const largestDimension = Math.max(
      image.naturalWidth,
      image.naturalHeight
    );

    const scale = Math.min(
      1,
      maxDimension / largestDimension
    );

    const canvas = document.createElement("canvas");

    canvas.width = Math.max(
      1,
      Math.round(image.naturalWidth * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(image.naturalHeight * scale)
    );

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare the image.");
    }

    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvasToJpeg(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToJpeg(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error(
              "Unable to compress the image."
            )
          );
        }
      },
      "image/jpeg",
      0.84
    );
  });
}

/*
 * ============================================================
 * SUBMIT MORPH IMAGE
 * ============================================================
 *
 * One submission = one Firestore document.
 *
 * Collection:
 *   morphImageSubmissions
 *
 * Lifecycle:
 *   Pending
 *   Approved
 *   Rejected
 *   NeedsInfo
 *
 * Creator Hub already understands this structure.
 */

export async function submitMorphImage(
  input: MorphSubmissionInput
): Promise<MorphSubmissionResult> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be signed in to submit a morph."
    );
  }

  const morphName = input.morphName.trim();
  const description = input.description.trim();
  const observedTraits = input.observedTraits.trim();
  const proofDetails = input.proofDetails.trim();
  const proofReference =
    input.proofReference?.trim() || undefined;

  /*
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  if (!morphName) {
    throw new Error(
      "Please enter the morph name."
    );
  }

  if (!description) {
    throw new Error(
      "Please describe the animal and why you believe it matches this morph."
    );
  }

  if (!input.image) {
    throw new Error(
      "Please add the primary morph photograph."
    );
  }

  if (!proofDetails) {
    throw new Error(
      "Supporting proof is required for factual review."
    );
  }

  if (!input.photoRequirementsConfirmed) {
    throw new Error(
      "Please confirm that the primary photograph meets the Morph Library requirements."
    );
  }

  if (!input.factualAccuracyConfirmed) {
    throw new Error(
      "Please confirm that the morph identification is supported by the evidence provided."
    );
  }

  if (
    input.creditMode === "name" &&
    !input.creditName?.trim()
  ) {
    throw new Error(
      "Please enter the name you want displayed."
    );
  }

  if (
    input.creditMode === "social" &&
    !input.creditSocial?.trim()
  ) {
    throw new Error(
      "Please enter the social handle or link you want displayed."
    );
  }

  /*
   * ==========================================================
   * PREPARE IMAGE
   * ==========================================================
   */

  let compressed: Blob;

  try {
    compressed = await prepareImage(input.image);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to prepare the selected image."
    );
  }

  /*
   * ==========================================================
   * CREATE SUBMISSION ID FIRST
   * ==========================================================
   *
   * We deliberately create the Firestore document reference
   * before uploading so the Storage path can contain the exact
   * submission ID.
   */

  const submissionRef = await addDoc(
    collection(db, "morphImageSubmissions"),
    {
      userId: user.uid,

      morphName,
      description,

      observedTraits:
        observedTraits || undefined,

      proofDetails,
      proofReference,

      photoRequirementsConfirmed: true,
      factualAccuracyConfirmed: true,

      creditType: input.creditMode,

      creditName:
        input.creditMode === "name"
          ? input.creditName?.trim()
          : undefined,

      creditSocial:
        input.creditMode === "social"
          ? input.creditSocial?.trim()
          : undefined,

      /*
       * Creator Hub expects Pending.
       *
       * The submission does NOT become approved simply because
       * the user submitted it.
       */
      status: "Pending",

      /*
       * Temporary placeholder.
       *
       * This is replaced below after Storage upload.
       */
      attachment: {
        path: "",
        type: "image",
        sizeBytes: 0,
      },

      submittedAt: serverTimestamp(),
    }
  );

  const submissionId = submissionRef.id;

  /*
   * ==========================================================
   * UPLOAD IMAGE
   * ==========================================================
   */

  const safeMorphName =
    slugify(morphName) || "morph";

  const storagePath =
    `morph-submissions/${user.uid}/${submissionId}/${safeMorphName}.jpg`;

  const storageRef = ref(
    storage,
    storagePath
  );

  try {
    await uploadBytes(
      storageRef,
      compressed,
      {
        contentType: "image/jpeg",
      }
    );

    /*
     * ========================================================
     * GET DOWNLOAD URL
     * ========================================================
     */

    /*
     * We don't strictly need the URL for moderation because
     * Creator Hub can retrieve it from the Storage path.
     *
     * Getting it here also verifies that the uploaded object
     * is readable before the submission is considered complete.
     */
    await getDownloadURL(storageRef);

    /*
     * ========================================================
     * FINALISE FIRESTORE RECORD
     * ========================================================
     *
     * NOTE:
     * We use updateDoc here rather than creating another
     * Firestore document.
     */

    const { updateDoc, doc } =
      await import("firebase/firestore");

    await updateDoc(
      doc(
        db,
        "morphImageSubmissions",
        submissionId
      ),
      {
        attachment: {
          path: storagePath,
          type: "image",
          sizeBytes: compressed.size,
        },

        /*
         * This allows Creator Hub to distinguish a genuinely
         * uploaded submission from an incomplete one.
         */
        uploadComplete: true,

        imageUploadedAt:
          serverTimestamp(),
      }
    );

    return {
      submissionId,
    };
  } catch (error) {
    /*
     * ========================================================
     * CLEANUP
     * ========================================================
     *
     * If Storage fails or finalisation fails, remove the
     * uploaded object if one exists.
     */

    await deleteStorageObjectSafely(storageRef);

    /*
     * We intentionally leave the Firestore submission record
     * rather than silently creating another one.
     *
     * This means Creator Hub/debugging can identify an
     * incomplete submission if required.
     */

    throw new Error(
      error instanceof Error
        ? `Your morph submission could not be completed. ${error.message}`
        : "Your morph submission could not be completed."
    );
  }
}

async function deleteStorageObjectSafely(
  storageRef: ReturnType<typeof ref>
): Promise<void> {
  try {
    const { deleteObject } =
      await import("firebase/storage");

    await deleteObject(storageRef);
  } catch {
    /*
     * Cleanup failure must never hide the original error.
     */
  }
}