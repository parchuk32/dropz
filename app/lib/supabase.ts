import { createBrowserClient } from "@supabase/ssr";

const URL_SUPABASE = "https://lnghavxkslpgejncdyfy.supabase.co";
const CLE_SUPABASE = "sb_publishable_nsC9FQz59oegn82f0L6pJQ_Wl7x6C9D";

export const supabaseConfigured = true;

let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabase() {
  if (!client) client = createBrowserClient(URL_SUPABASE, CLE_SUPABASE);
  return client;
}