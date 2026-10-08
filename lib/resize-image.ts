const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

export async function resizeImageFile(file: File) {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare the image.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) {
      throw new Error("Could not compress the image.");
    }

    return blob;
  } finally {
    bitmap.close();
  }
}
