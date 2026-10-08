import type { Verdict } from "@/lib/types";

export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function isHotDogLabel(label: string) {
  return label.trim().toLowerCase().replace(/[\s-]+/g, "_") === "hot_dog";
}

export function verdictFromLabel(label: string): Verdict {
  return isHotDogLabel(label) ? "hot_dog" : "not_hot_dog";
}

export function verdictHeadline(verdict: Verdict) {
  return verdict === "hot_dog" ? "Hot Dog" : "Not Hot Dog";
}

export function formatFoodLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatConfidence(confidence: number) {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function isLowConfidence(confidence: number) {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}
