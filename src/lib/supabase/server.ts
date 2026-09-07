import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer service role key for backend operations (bypasses RLS for enclave/matching & nullifier rate checks)
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseServiceKey.includes("your-key")
);

let serverClient: SupabaseClient<any> | null = null;

export function getSupabaseServerClient(): SupabaseClient<any> | null {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  if (!serverClient) {
    serverClient = createClient<any>(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}
