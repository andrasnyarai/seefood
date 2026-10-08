import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-admin", () => ({
  scanPublicUrl: (storagePath: string) => `https://example.test/scans/${storagePath}`,
}));

import { rowToScan } from "@/lib/scans";

describe("rowToScan", () => {
  it("maps a stored row into the UI scan shape", () => {
    const scan = rowToScan({
      id: "11111111-1111-4111-8111-111111111111",
      storage_path: "11111111-1111-4111-8111-111111111111.jpg",
      verdict: "not_hot_dog",
      label: "pizza",
      confidence: 0.42,
      created_at: "2026-10-08T12:00:00.000Z",
    });

    expect(scan).toMatchObject({
      imageUrl: "https://example.test/scans/11111111-1111-4111-8111-111111111111.jpg",
      verdict: "not_hot_dog",
      label: "pizza",
      confidence: 0.42,
      lowConfidence: true,
    });
  });
});
