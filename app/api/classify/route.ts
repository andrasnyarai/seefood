import { classifyJpeg, warmClassifier } from "@/lib/classifier";
import { toStoredJpeg } from "@/lib/images";
import { rowToScan, type ClassificationRow } from "@/lib/scans";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Prediction } from "@/lib/types";
import { verdictFromLabel } from "@/lib/verdict";

export const maxDuration = 120;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return jsonError("Upload a JPEG, PNG, WebP, or GIF.", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return jsonError("Choose an image to classify.", 400);
  }

  if (image.size === 0) {
    return jsonError("That file is empty.", 400);
  }

  if (image.size > MAX_UPLOAD_BYTES) {
    return jsonError("That image is too large. Choose a file under 8 MB.", 400);
  }

  if (image.type && !image.type.startsWith("image/")) {
    return jsonError("Choose an image file.", 400);
  }

  try {
    // Kick the model load while sharp is still working on the JPEG.
    void warmClassifier();
    const jpeg = await toStoredJpeg(Buffer.from(await image.arrayBuffer()));
    const rawPredictions = await classifyJpeg(jpeg);
    const [top] = rawPredictions;

    if (!top) {
      return jsonError("The classifier returned an empty result.", 502);
    }

    const id = crypto.randomUUID();
    const storagePath = `${id}.jpg`;
    const verdict = verdictFromLabel(top.label);
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage.from("scans").upload(storagePath, jpeg, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      console.error("Scan upload failed", uploadError);
      return jsonError("Could not store the image.", 502);
    }

    const { data, error: insertError } = await supabase
      .from("classifications")
      .insert({
        id,
        storage_path: storagePath,
        verdict,
        label: top.label,
        confidence: top.score,
      })
      .select("id, storage_path, verdict, label, confidence, created_at")
      .single();

    if (insertError || !data) {
      console.error("Scan insert failed", insertError);
      await supabase.storage.from("scans").remove([storagePath]);
      return jsonError("Could not store the classification.", 502);
    }

    const predictions: Prediction[] = rawPredictions.map((prediction) => ({
      label: prediction.label,
      confidence: prediction.score,
    }));

    return Response.json(rowToScan(data as ClassificationRow, predictions));
  } catch (error) {
    if (error instanceof Error && error.message === "UNREADABLE_IMAGE") {
      return jsonError("This file is not a readable image.", 400);
    }

    if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
      return jsonError("The image is still too large after compression.", 400);
    }

    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return jsonError("Storage is not configured.", 503);
    }

    console.error("Classification failed", error);
    return jsonError("The classifier is unavailable. Try again in a moment.", 502);
  }
}
