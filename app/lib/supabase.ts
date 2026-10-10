import { createBrowserClient } from "@supabase/ssr";

// Vrai seulement si .env.local contient les deux clés
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

let client: ReturnType<typeof createBrowserClient> | null = null;

// Un seul client pour tout le site. À n'appeler que si supabaseConfigured est vrai.
export function supabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return client;
}