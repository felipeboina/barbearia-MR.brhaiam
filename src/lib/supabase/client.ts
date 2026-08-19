import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase para uso em Client Components (browser). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
