// =========================================================
// TINY TITANS - IMAGE COMPRESSION
// =========================================================
//
// Compresses user-selected snake photos in the browser
// before they are saved to Firestore.
//
// This avoids storing huge original phone images and keeps
// snake documents comfortably below Firestore's document
// size limit.
//
// =========================================================

type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxOutputBytes?: number;
};


// =========================================================
// DEFAULT SETTINGS
// =========================================================

const DEFAULT_OPTIONS: Required<
  CompressImageOptions
> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.78,
  maxOutputBytes: 700 * 1024,
};


// =========================================================
// LOAD IMAGE
// =========================================================

function loadImage(
  file: File
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.onload =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          resolve(
            image
          );
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "Tiny Titans could not read this image."
            )
          );
        };

      image.src =
        objectUrl;
    }
  );
}


// =========================================================
// CANVAS TO BLOB
// =========================================================

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      canvas.toBlob(
        (
          blob
        ) => {
          if (!blob) {
            reject(
              new Error(
                "Tiny Titans could not process this image."
              )
            );

            return;
          }

          resolve(
            blob
          );
        },
        "image/jpeg",
        quality
      );
    }
  );
}


// =========================================================
// BLOB TO DATA URL
// =========================================================

function blobToDataUrl(
  blob: Blob
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onloadend =
        () => {
          if (
            typeof reader.result !==
            "string"
          ) {
            reject(
              new Error(
                "Tiny Titans could not prepare the compressed image."
              )
            );

            return;
          }

          resolve(
            reader.result
          );
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              "Tiny Titans could not read the compressed image."
            )
          );
        };

      reader.readAsDataURL(
        blob
      );
    }
  );
}


// =========================================================
// COMPRESS IMAGE
// =========================================================

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<string> {

  const settings = {
    ...DEFAULT_OPTIONS,
    ...options,
  };


  // -------------------------------------------------------
  // BASIC VALIDATION
  // -------------------------------------------------------

  if (!file) {
    throw new Error(
      "Please select an image first."
    );
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Tiny Titans only accepts image files."
    );
  }


  // -------------------------------------------------------
  // LOAD ORIGINAL IMAGE
  // -------------------------------------------------------

  const image =
    await loadImage(
      file
    );


  const originalWidth =
    image.naturalWidth;

  const originalHeight =
    image.naturalHeight;


  if (
    !originalWidth ||
    !originalHeight
  ) {
    throw new Error(
      "Tiny Titans could not determine the image dimensions."
    );
  }


  // -------------------------------------------------------
  // CALCULATE NEW DIMENSIONS
  // -------------------------------------------------------

  const scale =
    Math.min(
      1,
      settings.maxWidth /
        originalWidth,
      settings.maxHeight /
        originalHeight
    );


  let width =
    Math.round(
      originalWidth *
        scale
    );


  let height =
    Math.round(
      originalHeight *
        scale
    );


  // -------------------------------------------------------
  // CREATE CANVAS
  // -------------------------------------------------------

  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;

  canvas.height =
    height;


  const context =
    canvas.getContext(
      "2d"
    );


  if (!context) {
    throw new Error(
      "Tiny Titans could not prepare the image canvas."
    );
  }


  // -------------------------------------------------------
  // HIGH QUALITY IMAGE RESIZE
  // -------------------------------------------------------

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";


  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );


  // -------------------------------------------------------
  // INITIAL COMPRESSION
  // -------------------------------------------------------

  let blob =
    await canvasToBlob(
      canvas,
      settings.quality
    );


  // -------------------------------------------------------
  // PROGRESSIVELY REDUCE QUALITY
  // IF THE IMAGE IS STILL TOO LARGE
  // -------------------------------------------------------

  let quality =
    settings.quality;


  while (
    blob.size >
      settings.maxOutputBytes &&
    quality >
      0.45
  ) {

    quality -=
      0.06;


    blob =
      await canvasToBlob(
        canvas,
        quality
      );
  }


  // -------------------------------------------------------
  // IF STILL TOO LARGE, REDUCE DIMENSIONS
  // -------------------------------------------------------

  while (
    blob.size >
      settings.maxOutputBytes &&
    width >
      600
  ) {

    width =
      Math.round(
        width * 0.85
      );

    height =
      Math.round(
        height * 0.85
      );


    canvas.width =
      width;

    canvas.height =
      height;


    context.clearRect(
      0,
      0,
      width,
      height
    );


    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );


    blob =
      await canvasToBlob(
        canvas,
        quality
      );
  }


  // -------------------------------------------------------
  // FINAL SAFETY CHECK
  // -------------------------------------------------------

  if (
    blob.size >
      settings.maxOutputBytes
  ) {
    throw new Error(
      "This image is still too large after compression. Please choose a smaller photo."
    );
  }


  // -------------------------------------------------------
  // RETURN COMPRESSED DATA URL
  // -------------------------------------------------------

  return blobToDataUrl(
    blob
  );
}


// =========================================================
// EXPORT DEFAULT
// =========================================================

export default compressImage;