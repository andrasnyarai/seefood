import { describe, expect, it } from "vitest";
import { parseHistoryIds } from "@/lib/history-ids";

describe("parseHistoryIds", () => {
  it("keeps only valid UUIDs and caps the list at 30", () => {
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    const ids = Array.from({ length: 35 }, (_, index) =>
      `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`,
    );

    expect(parseHistoryIds(`${first}, not-a-uuid, ${second}`)).toEqual([first, second]);
    expect(parseHistoryIds(ids.join(","))).toHaveLength(30);
    expect(parseHistoryIds("")).toEqual([]);
  });
});
