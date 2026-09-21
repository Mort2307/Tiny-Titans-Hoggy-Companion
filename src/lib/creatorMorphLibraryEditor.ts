export function normaliseMorphSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function searchableMorphText(value: string | undefined): string {
  return normaliseMorphSearch(value ?? "");
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("The current morph image could not be downloaded for editing.");
  }
  return response.blob();
}

function loadHtmlImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The image could not be opened for cropping."));
    };

    image.src = url;
  });
}

export async function cropMorphImage(
  url: string,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<Blob> {
  const image = await loadHtmlImage(await fetchImageBlob(url));
  const sx = Math.round(image.naturalWidth * (left / 100));
  const sy = Math.round(image.naturalHeight * (top / 100));
  const sw = Math.max(1, Math.round(image.naturalWidth * (width / 100)));
  const sh = Math.max(1, Math.round(image.naturalHeight * (height / 100)));
  const scale = Math.min(1, 1800 / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not prepare the cropped image.");
  }

  context.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The cropped image could not be created.")),
      "image/jpeg",
      0.9,
    );
  });
}
