/**
 * Reads and validates Supabase connection configuration from the environment.
 *
 * These values are safe to expose to the browser (Next.js inlines anything
 * prefixed with NEXT_PUBLIC_). The service-role key must stay server-only.
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
  /** Server-only. Never send this to the client. */
  serviceRoleKey?: string;
  isConfigured: boolean;
}

export function getSupabaseEnv(
  env: Record<string, string | undefined> = process.env,
): SupabaseEnv {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured: Boolean(url && anonKey),
  };
}

/**
 * Like {@link getSupabaseEnv} but throws when the public client is missing.
 * Use this inside browser/server client factories.
 */
export function assertSupabaseConfigured(
  env: Record<string, string | undefined> = process.env,
): SupabaseEnv {
  const cfg = getSupabaseEnv(env);
  if (!cfg.isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return cfg;
}
