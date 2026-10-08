import sharp from "sharp";

const MAX_STORED_BYTES = 2 * 1024 * 1024;

export async function toStoredJpeg(input: Buffer) {
  let jpeg: Buffer;

  try {
    jpeg = await sharp(input, { failOn: "error" })
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new Error("UNREADABLE_IMAGE");
  }

  if (jpeg.byteLength > MAX_STORED_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  return jpeg;
}
