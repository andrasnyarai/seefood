import { warmClassifier } from "@/lib/classifier";

export const maxDuration = 120;

export async function POST() {
  try {
    await warmClassifier();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Classifier warmup failed", error);
    return Response.json({ ok: false }, { status: 502 });
  }
}
