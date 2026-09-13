import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured } from "./env";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Reads/writes auth cookies via `next/headers` so the user session stays in
 * sync between the browser and the server.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, anonKey } = assertSupabaseConfigured();
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* no-op: called from a Server Component */
        }
      },
    },
  });
}

/**
 * Service-role client with bypassed RLS. Use only on the server for
 * administrative tasks (storage, backfills, migrations tooling). Never expose
 * the result to the browser.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
  const key = serviceRoleKey ?? anonKey;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY " +
        "(or NEXT_PUBLIC_SUPABASE_ANON_KEY as a fallback).",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
