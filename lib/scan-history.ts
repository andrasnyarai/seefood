const STORAGE_KEY = "seefood.scanIds";
const MAX_SCANS = 30;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readScanIds() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_SCANS);
  } catch {
    return [];
  }
}

function writeScanIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_SCANS)));
}

export function rememberScanId(id: string) {
  const next = [id, ...readScanIds().filter((existing) => existing !== id)];
  writeScanIds(next);
  return next.slice(0, MAX_SCANS);
}

export function replaceScanIds(ids: string[]) {
  writeScanIds(ids);
  return ids.slice(0, MAX_SCANS);
}
