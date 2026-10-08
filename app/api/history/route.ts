import { parseHistoryIds } from "@/lib/history-ids";
import { rowToScan, type ClassificationRow } from "@/lib/scans";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 30;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = parseHistoryIds(raw);

  if (ids.length === 0) {
    return Response.json({ scans: [] });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("classifications")
      .select("id, storage_path, verdict, label, confidence, created_at")
      .in("id", ids);

    if (error) {
      console.error("History query failed", error);
      return Response.json({ error: "Could not load scan history." }, { status: 502 });
    }

    const scans = ((data ?? []) as ClassificationRow[]).map((row) => rowToScan(row));
    return Response.json({ scans });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return Response.json({ error: "Storage is not configured." }, { status: 503 });
    }

    console.error("History query failed", error);
    return Response.json({ error: "Could not load scan history." }, { status: 502 });
  }
}
