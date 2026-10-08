const MAX_IDS = 30;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keep only valid scan UUIDs from a comma-separated history query. */
export function parseHistoryIds(raw: string) {
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => UUID.test(id))
    .slice(0, MAX_IDS);
}
