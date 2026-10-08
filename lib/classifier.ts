import "onnxruntime-node";
import { env, pipeline, type ImageClassificationPipeline } from "@huggingface/transformers";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL_ID = "onnx-community/swin-finetuned-food101-ONNX";

env.cacheDir = "/tmp/transformers-cache";
env.allowLocalModels = false;

let classifierPromise: Promise<ImageClassificationPipeline> | null = null;

function getClassifier() {
  if (!classifierPromise) {
    console.info("Loading Food-101 classifier");
    classifierPromise = pipeline("image-classification", MODEL_ID, {
      dtype: "q8",
      // The Node build of Transformers.js serves this model through the native
      // ONNX runtime. WASM is not a supported device in that build.
      device: "cpu",
    }).catch((error: unknown) => {
      classifierPromise = null;
      throw error;
    });
  }

  return classifierPromise;
}

export type RawPrediction = {
  label: string;
  score: number;
};

export async function classifyJpeg(jpeg: Buffer): Promise<RawPrediction[]> {
  const filePath = path.join("/tmp", `seefood-${crypto.randomUUID()}.jpg`);
  await writeFile(filePath, jpeg);

  try {
    const classifier = await getClassifier();
    const output = await classifier(filePath, { top_k: 3 });
    if (!Array.isArray(output) || output.length === 0 || Array.isArray(output[0])) {
      throw new Error("The classifier returned an empty result.");
    }

    return output.map((prediction) => {
      if (
        typeof prediction.label !== "string" ||
        typeof prediction.score !== "number" ||
        !Number.isFinite(prediction.score)
      ) {
        throw new Error("The classifier returned an unreadable result.");
      }

      return { label: prediction.label, score: prediction.score };
    });
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}
