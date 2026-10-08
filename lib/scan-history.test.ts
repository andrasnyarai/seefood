import { beforeEach, describe, expect, it, vi } from "vitest";
import { readScanIds, rememberScanId, replaceScanIds } from "@/lib/scan-history";

describe("scan history", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  it("prepends a new scan and moves a repeat to the front", () => {
    rememberScanId("a");
    rememberScanId("b");
    rememberScanId("a");
    expect(readScanIds()).toEqual(["a", "b"]);
  });

  it("keeps at most 30 ids", () => {
    for (let index = 0; index < 35; index += 1) {
      rememberScanId(`id-${index}`);
    }
    const ids = readScanIds();
    expect(ids).toHaveLength(30);
    expect(ids[0]).toBe("id-34");
    expect(ids.at(-1)).toBe("id-5");
  });

  it("replaces the list when history prunes missing rows", () => {
    rememberScanId("gone");
    rememberScanId("kept");
    expect(replaceScanIds(["kept"])).toEqual(["kept"]);
    expect(readScanIds()).toEqual(["kept"]);
  });
});
