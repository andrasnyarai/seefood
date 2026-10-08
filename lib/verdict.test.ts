import { describe, expect, it } from "vitest";
import {
  formatConfidence,
  formatFoodLabel,
  isHotDogLabel,
  isLowConfidence,
  verdictFromLabel,
  verdictHeadline,
} from "@/lib/verdict";

describe("verdictFromLabel", () => {
  it("treats hot dog spellings as Hot Dog", () => {
    expect(verdictFromLabel("hot_dog")).toBe("hot_dog");
    expect(verdictFromLabel("Hot Dog")).toBe("hot_dog");
    expect(verdictFromLabel("hot-dog")).toBe("hot_dog");
  });

  it("treats every other Food-101 label as Not Hot Dog", () => {
    expect(verdictFromLabel("pizza")).toBe("not_hot_dog");
    expect(verdictFromLabel("hamburger")).toBe("not_hot_dog");
  });
});

describe("verdict display helpers", () => {
  it("formats headlines, labels, and confidence for the UI", () => {
    expect(verdictHeadline("hot_dog")).toBe("Hot Dog");
    expect(verdictHeadline("not_hot_dog")).toBe("Not Hot Dog");
    expect(formatFoodLabel("strawberry_shortcake")).toBe("Strawberry Shortcake");
    expect(formatConfidence(0.991)).toBe("99.1%");
  });

  it("marks scores under 50% as low confidence", () => {
    expect(isLowConfidence(0.499)).toBe(true);
    expect(isLowConfidence(0.5)).toBe(false);
    expect(isHotDogLabel("not_hot_dog")).toBe(false);
  });
});
