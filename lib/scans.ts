import type { Prediction, Scan, Verdict } from "@/lib/types";
import { isLowConfidence } from "@/lib/verdict";
import { scanPublicUrl } from "@/lib/supabase-admin";

export type ClassificationRow = {
  id: string;
  storage_path: string;
  verdict: Verdict;
  label: string;
  confidence: number;
  created_at: string;
};

export function rowToScan(row: ClassificationRow, predictions?: Prediction[]): Scan {
  return {
    id: row.id,
    imageUrl: scanPublicUrl(row.storage_path),
    verdict: row.verdict,
    label: row.label,
    confidence: row.confidence,
    lowConfidence: isLowConfidence(row.confidence),
    createdAt: row.created_at,
    predictions,
  };
}
