import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-anon-key")
);

let browserClient: SupabaseClient<any> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<any> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient<any>(supabaseUrl!, supabaseAnonKey!);
  }

  return browserClient;
}
