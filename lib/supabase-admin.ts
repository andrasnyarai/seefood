import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

export function scanPublicUrl(storagePath: string) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return `${base}/storage/v1/object/public/scans/${storagePath}`;
}
